const { InstanceBase, InstanceStatus, combineRgb } = require('@companion-module/base')
const L = require('./logic')

const POLL_MS = 1000

class GfxSportInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.state = null
		this.eventId = null
		this.bibSel = ''
		this.timer = null
		this.stopped = false
		this.connected = false
		this.lastError = ''
		this.signature = ''
	}

	async init(config) {
		this.config = config
		this.stopped = false
		this.updateStatus(InstanceStatus.Connecting)
		this.defineVariables()
		this.rebuildDefinitions()
		this.updateVariables()
		this.schedule(0)
	}

	async destroy() {
		this.stopped = true
		clearTimeout(this.timer)
	}

	async configUpdated(config) {
		this.config = config
		this.eventId = null
		this.state = null
		this.signature = ''
		clearTimeout(this.timer)
		this.updateStatus(InstanceStatus.Connecting)
		this.rebuildDefinitions()
		this.schedule(0)
	}

	getConfigFields() {
		return [
			{ type: 'static-text', id: 'info', width: 12, label: 'GFX SPORT', value: 'Connecta amb la plataforma GFX SPORT (el servidor on corre la consola de broadcast).' },
			{ type: 'textinput', id: 'host', label: 'Servidor (IP o nom)', width: 8, default: '192.168.100.50' },
			{ type: 'number', id: 'port', label: 'Port', width: 4, default: 3000, min: 1, max: 65535 },
			{ type: 'textinput', id: 'user', label: 'Usuari', width: 6, default: 'admin' },
			{ type: 'textinput', id: 'password', label: 'Contrasenya', width: 6, default: '' },
			{
				type: 'textinput',
				id: 'eventId',
				label: "Id de l'esdeveniment (buit = el primer d'esdeveniments trail)",
				width: 12,
				default: '',
			},
		]
	}

	// ── HTTP ──
	async http(method, path, body) {
		const { host, port, user, password } = this.config
		const headers = { accept: 'application/json' }
		if (body !== undefined) headers['content-type'] = 'application/json'
		if (user) headers.authorization = 'Basic ' + Buffer.from(`${user}:${password ?? ''}`).toString('base64')
		const res = await fetch(`http://${host}:${port || 3000}${path}`, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(4000),
		})
		if (res.status === 401) {
			const e = new Error('Usuari o contrasenya incorrectes')
			e.auth = true
			throw e
		}
		if (!res.ok) {
			const e = new Error(`HTTP ${res.status}`)
			e.status = res.status
			throw e
		}
		return res.json()
	}

	async resolveEvent() {
		const id = String(this.config.eventId ?? '').trim()
		if (id) return id
		const list = await this.http('GET', '/api/trail/events')
		if (!Array.isArray(list) || list.length === 0) throw new Error("No hi ha cap esdeveniment trail al servidor")
		return list[0].id
	}

	// ── Sondeig ──
	schedule(ms) {
		if (this.stopped) return
		clearTimeout(this.timer)
		this.timer = setTimeout(() => this.poll(), ms)
	}

	async poll() {
		try {
			if (!this.eventId) this.eventId = await this.resolveEvent()
			const st = await this.http('GET', `/api/trail/events/${this.eventId}/companion`)
			this.applyState(st)
			if (!this.connected || this.lastError) {
				this.connected = true
				this.lastError = ''
				this.updateStatus(InstanceStatus.Ok)
				this.checkFeedbacks()
			}
		} catch (e) {
			if (e.status === 404) this.eventId = null // l'esdeveniment ja no existeix: es tornarà a buscar
			this.connected = false
			this.lastError = e.message || String(e)
			this.updateStatus(e.auth ? InstanceStatus.AuthenticationFailure : InstanceStatus.ConnectionFailure, this.lastError)
			this.updateVariables()
			this.checkFeedbacks()
		} finally {
			this.schedule(POLL_MS)
		}
	}

	/** Només les dades que canvien les llistes d'opcions/presets fan reconstruir-los. */
	structureSignature(st) {
		return JSON.stringify([
			st.event.id,
			st.scenes.length,
			st.races.map((r) => [r.id, r.name, r.checkpoints.length, r.segments.map((s) => s.name)]),
			st.others.map((o) => [o.id, o.name, o.role]),
			st.devices.map((d) => [d.id, d.label]),
		])
	}

	applyState(st) {
		const sig = this.structureSignature(st)
		this.state = st
		if (sig !== this.signature) {
			this.signature = sig
			this.rebuildDefinitions()
		}
		this.updateVariables()
		this.checkFeedbacks()
	}

	// ── Variables ──
	defineVariables() {
		const defs = [
			{ variableId: 'connected', name: 'Connectat (1/0)' },
			{ variableId: 'status_text', name: 'Estat: OK o error' },
			{ variableId: 'event_name', name: "Nom de l'esdeveniment" },
			{ variableId: 'ticker', name: 'Ticker en antena (ON/OFF)' },
			{ variableId: 'layers_count', name: "Nombre d'escenes en antena" },
			{ variableId: 'bib_sel', name: 'Dorsal seleccionat al teclat' },
			{ variableId: 'vmix_input', name: "Input de vMix en programa" },
			{ variableId: 'vmix_device', name: 'Motxilla en programa a vMix' },
			{ variableId: 'vmix_bib', name: 'Dorsal de la motxilla en programa' },
			{ variableId: 'vmix_runner', name: 'Atleta de la motxilla en programa' },
		]
		for (const [slot, label] of Object.entries(L.SLOTS)) defs.push({ variableId: `slot_${slot}`, name: `En antena — ${label}` })
		this.setVariableDefinitions(defs)
	}

	updateVariables() {
		const st = this.state
		const layers = st?.program?.layers ?? {}
		const values = {
			connected: this.connected ? 1 : 0,
			status_text: this.connected ? 'OK' : this.lastError || '…',
			event_name: st?.event?.name ?? '',
			ticker: st?.program?.ticker ? 'ON' : 'OFF',
			layers_count: Object.keys(layers).length,
			bib_sel: this.bibSel,
			vmix_input: st?.vmix?.active_title ?? (st?.vmix?.active_input ?? ''),
			vmix_device: st?.vmix?.device_label ?? '',
			vmix_bib: st?.vmix?.bib ?? '',
			vmix_runner: st?.vmix?.runner_name ?? '',
		}
		for (const slot of Object.keys(L.SLOTS)) values[`slot_${slot}`] = layers[slot] ? L.describeLayer(st, layers[slot]) : ''
		this.setVariableValues(values)
	}

	// ── Accions, feedbacks i presets ──
	rebuildDefinitions() {
		this.setActionDefinitions(this.actionDefinitions())
		this.setFeedbackDefinitions(this.feedbackDefinitions())
		this.setPresetDefinitions(L.buildPresets(this.state, combineRgb, this.label))
	}

	async resolveBib(raw) {
		const v = String(raw ?? '').trim()
		if (v === '@sel') return this.bibSel
		return String((await this.parseVariablesInString(v)) ?? '').trim()
	}

	async post(path, body) {
		try {
			const res = await this.http('POST', path, body)
			if (res && res.layers && this.state) {
				// resposta del programa: s'aplica a l'instant, sense esperar el següent sondeig
				this.state.program = { layers: res.layers, ticker: res.ticker, updated_at: res.updated_at }
				this.updateVariables()
				this.checkFeedbacks()
			}
			return res
		} catch (e) {
			this.log('error', `${path}: ${e.message}`)
			if (e.auth) this.updateStatus(InstanceStatus.AuthenticationFailure, e.message)
			return null
		}
	}

	async layerFromOptions(options) {
		if (!this.state) return null
		const need = L.sceneDef(this.state, options.scene)?.needs ?? []
		const bib = need.includes('bib') ? await this.resolveBib(options.bib) : ''
		if (need.includes('bib') && !bib) {
			this.log('warn', 'Cal triar un dorsal (teclat de dorsal o camp «Dorsal») abans de posar el chyron o la fitxa.')
			return null
		}
		return L.buildLayer(this.state, options, bib)
	}

	actionDefinitions() {
		const fields = L.sceneOptionFields(this.state)
		const programPath = () => `/api/trail/events/${this.eventId}/program`
		return {
			scene_on: {
				name: 'Posa una escena en antena',
				description: "Substitueix l'escena de la mateixa zona; les altres zones es mantenen.",
				options: fields,
				callback: async ({ options }) => {
					const layer = await this.layerFromOptions(options)
					if (layer) await this.post(programPath(), { layer })
				},
			},
			scene_toggle: {
				name: 'Escena en antena / treure (alterna)',
				description: "Si l'escena ja és en antena, la treu; si no, la posa. Ideal per a un botó de l'Stream Deck.",
				options: fields,
				callback: async ({ options }) => {
					const layer = await this.layerFromOptions(options)
					if (!layer) return
					const slot = L.slotOf(this.state, layer.scene)
					const current = this.state?.program?.layers?.[slot]
					if (L.layerMatches(current, layer)) await this.post(programPath(), { clear: slot })
					else await this.post(programPath(), { layer })
				},
			},
			clear_slot: {
				name: 'Treu la zona de pantalla',
				options: [
					{
						type: 'dropdown',
						id: 'slot',
						label: 'Zona',
						default: 'main',
						choices: Object.entries(L.SLOTS).map(([id, label]) => ({ id, label })),
					},
				],
				callback: async ({ options }) => {
					await this.post(programPath(), { clear: options.slot })
				},
			},
			clear_all: {
				name: "Neteja totes les escenes",
				options: [{ type: 'checkbox', id: 'ticker', label: 'Treu també el ticker de passos', default: false }],
				callback: async ({ options }) => {
					await this.post(programPath(), options.ticker ? { clear: 'all', ticker: false } : { clear: 'all' })
				},
			},
			ticker: {
				name: 'Ticker de passos per control',
				options: [
					{
						type: 'dropdown',
						id: 'mode',
						label: 'Acció',
						default: 'toggle',
						choices: [
							{ id: 'toggle', label: 'Alterna' },
							{ id: 'on', label: 'Posa en antena' },
							{ id: 'off', label: 'Treu' },
						],
					},
				],
				callback: async ({ options }) => {
					const cur = !!this.state?.program?.ticker
					const next = options.mode === 'on' ? true : options.mode === 'off' ? false : !cur
					await this.post(programPath(), { ticker: next })
				},
			},
			sync: {
				name: 'Sincronitza amb LiveTrail',
				options: [{ type: 'checkbox', id: 'registrants', label: "Importa també la llista d'inscrits (pot trigar)", default: false }],
				callback: async ({ options }) => {
					await this.post(`/api/trail/events/${this.eventId}/sync`, { registrants: !!options.registrants })
				},
			},
			bib_digit: {
				name: 'Teclat de dorsal: afegeix una xifra',
				options: [{ type: 'textinput', id: 'digit', label: 'Xifra', default: '1', regex: '/^[0-9]$/' }],
				callback: async ({ options }) => {
					this.bibSel = (this.bibSel + options.digit).slice(-5)
					this.updateVariables()
				},
			},
			bib_back: {
				name: 'Teclat de dorsal: esborra l\'última xifra',
				options: [],
				callback: async () => {
					this.bibSel = this.bibSel.slice(0, -1)
					this.updateVariables()
				},
			},
			bib_clear: {
				name: 'Teclat de dorsal: esborra-ho tot',
				options: [],
				callback: async () => {
					this.bibSel = ''
					this.updateVariables()
				},
			},
			bib_set: {
				name: 'Teclat de dorsal: fixa un dorsal',
				options: [{ type: 'textinput', id: 'bib', label: 'Dorsal', default: '', useVariables: true }],
				callback: async ({ options }) => {
					this.bibSel = (await this.resolveBib(options.bib)).replace(/\D/g, '').slice(-5)
					this.updateVariables()
				},
			},
		}
	}

	feedbackDefinitions() {
		const red = { bgcolor: combineRgb(200, 0, 0), color: combineRgb(255, 255, 255) }
		return {
			scene_on_air: {
				type: 'boolean',
				name: "L'escena és en antena",
				description: 'Il·lumina el botó quan aquesta escena (amb aquests paràmetres) és en antena.',
				defaultStyle: red,
				options: L.sceneOptionFields(this.state, { forFeedback: true }),
				callback: ({ options }) => {
					if (!this.state) return false
					const layer = L.buildLayer(this.state, options, '')
					if (!layer) return false
					const slot = L.slotOf(this.state, layer.scene)
					return L.layerMatches(this.state.program?.layers?.[slot], layer)
				},
			},
			slot_busy: {
				type: 'boolean',
				name: 'Hi ha alguna escena en aquesta zona',
				defaultStyle: red,
				options: [
					{
						type: 'dropdown',
						id: 'slot',
						label: 'Zona',
						default: 'main',
						choices: Object.entries(L.SLOTS).map(([id, label]) => ({ id, label })),
					},
				],
				callback: ({ options }) => !!this.state?.program?.layers?.[options.slot],
			},
			ticker_on: {
				type: 'boolean',
				name: 'Ticker de passos en antena',
				defaultStyle: red,
				options: [],
				callback: () => !!this.state?.program?.ticker,
			},
			connected: {
				type: 'boolean',
				name: 'Connectat amb la plataforma',
				defaultStyle: { bgcolor: combineRgb(0, 100, 0), color: combineRgb(255, 255, 255) },
				options: [],
				callback: () => this.connected,
			},
		}
	}
}

module.exports = { GfxSportInstance }

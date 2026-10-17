// Lògica pura del mòdul (sense dependències de Companion): es pot provar contra el servidor real.

const SLOTS = {
	main: 'Centre',
	lower: 'Inferior',
	chrono: 'Cronòmetre',
	tag: 'Etiqueta posició',
	mini: 'Classif. petita',
	gauge_speed: 'Dial velocitat',
	gauge_gradient: 'Dial pendent',
}

// Nom curt de cada cursa per als botons (LiveTrail: trail / mitja / curta)
const SHORT_RACE = { trail: 'PUTU', mitja: 'MITJA', curta: 'CURTA' }
const shortRace = (race) => SHORT_RACE[race.id] || String(race.id).toUpperCase().slice(0, 6)

const needs = (state, sceneId) => (state?.scenes.find((s) => s.id === sceneId)?.needs ?? [])
const sceneDef = (state, sceneId) => state?.scenes.find((s) => s.id === sceneId)

/** Opcions per defecte de l'acció scene_on / scene_toggle / feedback scene_on_air */
function defaultOptions(state) {
	return {
		scene: state?.scenes[0]?.id ?? 'presentation_profile',
		race: state?.races[0]?.id ?? '',
		sex: 'M',
		position: 1,
		bib: '',
		segment: '',
		device: 'auto',
		point: '',
		other: state?.others[0]?.id ?? '',
	}
}

/** Camps d'opció de l'escena (només es mostren els que l'escena necessita). */
function sceneOptionFields(state, { forFeedback = false } = {}) {
	const races = state?.races ?? []
	const def = defaultOptions(state)
	const vis = (need) => (options) => needs(state, options.scene).includes(need)
	const segChoices = []
	for (const r of races) for (const s of r.segments) segChoices.push({ id: `${r.id}|${s.from_km}|${s.to_km}|${s.name}`, label: `${shortRace(r)} · ${s.name}` })
	const ptChoices = []
	for (const r of races) for (const c of r.checkpoints) ptChoices.push({ id: `${r.id}|${c.id}`, label: `${shortRace(r)} · ${c.name} (km ${c.km})` })
	const devChoices = [{ id: 'auto', label: '🎥 Automàtic (el que és en programa a vMix)' }]
	for (const d of state?.devices ?? []) devChoices.push({ id: d.id, label: `${d.label} (${d.id})` })
	const fields = [
		{
			type: 'dropdown',
			id: 'scene',
			label: 'Escena',
			default: def.scene,
			choices: (state?.scenes ?? []).map((s) => ({ id: s.id, label: `${s.group} · ${s.label}` })),
		},
		{
			type: 'dropdown',
			id: 'race',
			label: 'Cursa',
			default: def.race,
			choices: races.map((r) => ({ id: r.id, label: r.name })),
			isVisible: vis('race'),
		},
		{
			type: 'dropdown',
			id: 'sex',
			label: 'Categoria',
			default: 'M',
			choices: [
				{ id: 'M', label: 'Homes' },
				{ id: 'F', label: 'Dones' },
			],
			isVisible: vis('sex'),
		},
		{
			type: 'number',
			id: 'position',
			label: 'Posició (1-5)',
			default: 1,
			min: 1,
			max: 5,
			isVisible: vis('position'),
		},
		{
			type: 'dropdown',
			id: 'segment',
			label: 'Segment',
			default: segChoices[0]?.id ?? '',
			choices: segChoices.length ? segChoices : [{ id: '', label: '(cal GPX a la cursa)' }],
			isVisible: vis('segment'),
		},
		{
			type: 'dropdown',
			id: 'point',
			label: 'Control',
			default: ptChoices[0]?.id ?? '',
			choices: ptChoices.length ? ptChoices : [{ id: '', label: '(sense controls)' }],
			isVisible: vis('point'),
		},
		{
			type: 'dropdown',
			id: 'device',
			label: 'Motxilla',
			default: 'auto',
			choices: devChoices,
			isVisible: vis('device'),
		},
		{
			type: 'dropdown',
			id: 'other',
			label: 'Persona',
			default: def.other,
			choices: (state?.others ?? []).map((o) => ({ id: o.id, label: `${o.name} · ${o.role}` })),
			isVisible: vis('other'),
		},
	]
	if (!forFeedback) {
		fields.splice(4, 0, {
			type: 'textinput',
			id: 'bib',
			label: 'Dorsal (o @sel = el seleccionat al teclat)',
			default: '',
			useVariables: true,
			isVisible: vis('bib'),
		})
	}
	return fields
}

/** Converteix les opcions d'una acció en la «capa» que entén el servidor. `bib` ja ha de venir resolt. */
function buildLayer(state, options, bib = '') {
	const def = sceneDef(state, options.scene)
	if (!def) return null
	const n = def.needs
	const layer = { scene: def.id, race_id: null }
	if (n.includes('race')) layer.race_id = options.race || state.races[0]?.id || null
	if (n.includes('sex')) layer.sex = options.sex === 'F' ? 'F' : 'M'
	if (n.includes('position')) layer.position = Math.min(5, Math.max(1, parseInt(options.position, 10) || 1))
	if (n.includes('bib')) layer.bib = String(bib || '')
	if (n.includes('segment')) {
		const [race, from, to, ...name] = String(options.segment || '').split('|')
		if (race) {
			layer.race_id = race
			layer.from_km = parseFloat(from)
			layer.to_km = parseFloat(to)
			layer.label = name.join('|')
		}
	}
	if (n.includes('point')) {
		const [race, id] = String(options.point || '').split('|')
		if (race) {
			layer.race_id = race
			layer.point = parseInt(id, 10)
		}
	}
	if (n.includes('device')) layer.device = options.device || 'auto'
	if (n.includes('other')) layer.other = options.other
	return layer
}

/** La capa en antena és la mateixa que la demanada? (només es comparen els paràmetres que defineixen l'escena) */
function layerMatches(current, wanted) {
	if (!current || !wanted || current.scene !== wanted.scene) return false
	for (const k of ['race_id', 'sex', 'position', 'from_km', 'to_km', 'device', 'point', 'other']) {
		if (wanted[k] === undefined || wanted[k] === null || wanted[k] === '') continue
		if (String(current[k]) !== String(wanted[k])) return false
	}
	// el dorsal només es compara si és un número concret
	if (wanted.bib && /^\d+$/.test(wanted.bib) && String(current.bib) !== wanted.bib) return false
	return true
}

function slotOf(state, sceneId) {
	return sceneDef(state, sceneId)?.slot
}

function describeLayer(state, layer) {
	if (!layer) return ''
	const def = sceneDef(state, layer.scene)
	const race = state?.races.find((r) => r.id === layer.race_id)
	const bits = [def?.label ?? layer.scene]
	if (race) bits.push(shortRace(race))
	if (layer.sex) bits.push(layer.sex === 'F' ? 'Dones' : 'Homes')
	if (layer.position) bits.push(`pos ${layer.position}`)
	if (layer.bib) bits.push(layer.bib === 'auto' ? 'auto' : `#${layer.bib}`)
	if (layer.device) bits.push(layer.device === 'auto' ? 'auto' : layer.device)
	if (layer.other) bits.push(state?.others.find((o) => o.id === layer.other)?.name ?? layer.other)
	return bits.join(' · ')
}

// ── Presets ──
// Colors per categoria [r,g,b]
const COL = {
	pres: [120, 60, 0],
	cursa: [0, 70, 110],
	classif: [20, 90, 40],
	pos: [60, 40, 110],
	hist: [90, 70, 10],
	seg: [0, 85, 85],
	crono: [70, 70, 70],
	motx: [110, 40, 70],
	atl: [40, 60, 110],
	altres: [80, 50, 50],
	ctrl: [110, 0, 0],
}

const ORD = { 1: '1r', 2: '2n', 3: '3r', 4: '4t', 5: '5è' }

/**
 * Genera tots els presets (botons de l'Stream Deck) a partir de l'estat del servidor.
 * `rgb` = combineRgb de Companion; `label` = nom de la instància (per referenciar variables).
 */
function buildPresets(state, rgb, label) {
	const presets = {}
	if (!state) return presets
	const base = defaultOptions(state)
	const on = (partial) => ({ ...base, ...partial })

	const add = (id, category, name, text, color, sceneOptions, extra = {}) => {
		const feedbackOptions = { ...sceneOptions }
		presets[id] = {
			type: 'button',
			category,
			name,
			style: { text, size: extra.size ?? '14', color: rgb(255, 255, 255), bgcolor: rgb(...color) },
			steps: [{ down: [{ actionId: 'scene_toggle', options: sceneOptions }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'scene_on_air',
					options: feedbackOptions,
					style: { bgcolor: rgb(200, 0, 0), color: rgb(255, 255, 255) },
				},
			],
		}
	}

	for (const r of state.races) {
		const S = shortRace(r)
		add(`pres_${r.id}`, '1 · Presentació', `Presentació ${r.name}`, `PRESENT.\\n${S}`, COL.pres, on({ scene: 'presentation_profile', race: r.id }))
		add(`hl_stats_${r.id}`, '2 · Cursa', `Fitxa tècnica ${r.name}`, `FITXA\\nTÈCNICA\\n${S}`, COL.cursa, on({ scene: 'highlights_stats', race: r.id }))
		add(`hl_climb_${r.id}`, '2 · Cursa', `Pujada més dura ${r.name}`, `PUJADA\\nDURA\\n${S}`, COL.cursa, on({ scene: 'highlights_climb', race: r.id }))
		add(`hl_desc_${r.id}`, '2 · Cursa', `Gran baixada ${r.name}`, `GRAN\\nBAIXADA\\n${S}`, COL.cursa, on({ scene: 'highlights_descent', race: r.id }))
		add(`hl_surf_${r.id}`, '2 · Cursa', `Superfícies ${r.name}`, `SUPERF.\\n${S}`, COL.cursa, on({ scene: 'highlights_surface', race: r.id }))
		add(`prof_lead_${r.id}`, '2 · Cursa', `Perfil amb els primers ${r.name}`, `PERFIL\\nPRIMERS\\n${S}`, COL.cursa, on({ scene: 'profile_leaders', race: r.id }))
		add(`weather_${r.id}`, '2 · Cursa', `Meteo ${r.name}`, `METEO\\n${S}`, COL.cursa, on({ scene: 'weather', race: r.id }))
		add(`stats_${r.id}`, '2 · Cursa', `Estadístiques ${r.name}`, `ESTADÍST.\\n${S}`, COL.cursa, on({ scene: 'race_stats', race: r.id }))

		for (const sx of ['M', 'F']) {
			const SX = sx === 'M' ? 'HOMES' : 'DONES'
			add(`lb_${r.id}_${sx}`, '3 · Classificació', `Classificació ${SX} ${r.name}`, `CLASSIF.\\n${SX}\\n${S}`, COL.classif, on({ scene: 'leaderboard', race: r.id, sex: sx }))
			add(`mini_${r.id}_${sx}`, '3 · Classificació', `Top 5 petita ${SX} ${r.name}`, `TOP 5\\n${SX}\\n${S}`, COL.classif, on({ scene: 'leaderboard_mini', race: r.id, sex: sx }))
			for (const c of r.checkpoints) {
				const cpn = String(c.name).toUpperCase().slice(0, 9)
				add(`minipt_${r.id}_${sx}_${c.id}`, `3 · Top 5 per punt ${S}`, `Top 5 ${SX} a ${c.name} (${r.name})`, `TOP5 ${sx === 'M' ? 'H' : 'D'}\\n${cpn}\\n${S}`, COL.classif, on({ scene: 'leaderboard_point_mini', race: r.id, sex: sx, point: `${r.id}|${c.id}` }), { size: '14' })
			}
			add(`fav_${r.id}_${sx}`, '3 · Classificació', `Favorits ${SX} ${r.name}`, `FAVORITS\\n${SX}\\n${S}`, COL.classif, on({ scene: 'favorites', race: r.id, sex: sx }))
			for (let p = 1; p <= 5; p++) {
				add(`pos_${r.id}_${sx}_${p}`, `4 · Posició ${S}`, `${ORD[p]} ${SX} ${r.name}`, `${ORD[p]}\\n${sx === 'M' ? 'HOME' : 'DONA'}\\n${S}`, COL.pos, on({ scene: 'position_tag', race: r.id, sex: sx, position: p }), { size: '18' })
			}
		}

		add(`hist_rec_${r.id}`, '5 · Històric', `Rècord ${r.name}`, `RÈCORD\\n${S}`, COL.hist, on({ scene: 'history_record', race: r.id }))
		add(`hist_win_${r.id}`, '5 · Històric', `Guanyadors ${r.name}`, `GUANY.\\n${S}`, COL.hist, on({ scene: 'history_winners', race: r.id }))
		add(`chrono_${r.id}`, '7 · Cronòmetres', `Cronòmetre ${r.name}`, `CRONO\\n${S}`, COL.crono, on({ scene: 'chrono', race: r.id }))

		r.segments.forEach((s, i) => {
			const seg = `${r.id}|${s.from_km}|${s.to_km}|${s.name}`
			const to = String(s.to).toUpperCase().slice(0, 9)
			add(`seg_info_${r.id}_${i}`, `6 · Segments ${S}`, `Segment info ${r.name}: ${s.name}`, `SEG ${i + 1}\\n${to}\\nINFO`, COL.seg, on({ scene: 'segment_info', race: r.id, segment: seg }))
			add(`seg_prof_${r.id}_${i}`, `6 · Segments ${S}`, `Segment perfil ${r.name}: ${s.name}`, `SEG ${i + 1}\\n${to}\\nPERFIL`, COL.seg, on({ scene: 'segment_profile', race: r.id, segment: seg }))
		})

		// chyron / fitxa amb el dorsal triat al teclat (@sel)
		add(`chyron_${r.id}`, '9 · Atletes', `Chyron corredor ${r.name} (dorsal seleccionat)`, `CHYRON\\n${S}\\n#$(${label}:bib_sel)`, COL.atl, on({ scene: 'runner_chyron', race: r.id, bib: '@sel' }))
		add(`card_${r.id}`, '9 · Atletes', `Fitxa corredor ${r.name} (dorsal seleccionat)`, `FITXA\\n${S}\\n#$(${label}:bib_sel)`, COL.atl, on({ scene: 'runner_card', race: r.id, bib: '@sel' }))
	}

	add('chrono_all', '7 · Cronòmetres', 'Cronòmetres de les 3 curses', 'CRONOS\\nTOTES', COL.crono, on({ scene: 'chrono_all' }))
	add('gps_speed_auto', '8 · Motxilles', 'Velocitat de la motxilla en programa (vMix)', 'VELOC.\\nAUTO', COL.motx, on({ scene: 'gps_speed', device: 'auto' }))
	add('gps_grad_auto', '8 · Motxilles', 'Pendent de la motxilla en programa (vMix)', 'PENDENT\\nAUTO', COL.motx, on({ scene: 'gps_gradient', device: 'auto' }))

	for (const o of state.others) {
		const [first, ...rest] = o.name.toUpperCase().split(' ')
		add(`other_${o.id}`, '10 · Altres', `Chyron ${o.name} (${o.role})`, `${first}\\n${rest.join(' ')}\\n${String(o.role).toUpperCase().slice(0, 12)}`, COL.altres, on({ scene: 'chyron_other', other: o.id }))
	}

	// Teclat de dorsal
	const key = (id, text, actionId, options, color = COL.atl) => {
		presets[id] = {
			type: 'button',
			category: '9 · Atletes',
			name: text.replace(/\\n/g, ' '),
			style: { text, size: '24', color: rgb(255, 255, 255), bgcolor: rgb(...color) },
			steps: [{ down: [{ actionId, options }], up: [] }],
			feedbacks: [],
		}
	}
	for (let d = 0; d <= 9; d++) key(`bib_${d}`, String(d), 'bib_digit', { digit: String(d) })
	key('bib_back', '⌫', 'bib_back', {}, [90, 60, 20])
	key('bib_clear', 'C', 'bib_clear', {}, [110, 0, 0])
	presets.bib_show = {
		type: 'button',
		category: '9 · Atletes',
		name: 'Dorsal seleccionat',
		style: { text: `DORSAL\\n#$(${label}:bib_sel)`, size: '18', color: rgb(255, 255, 255), bgcolor: rgb(20, 20, 20) },
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Control
	const ctl = (id, name, text, color, actionId, options, feedbackId, fbOptions) => {
		presets[id] = {
			type: 'button',
			category: '0 · Control',
			name,
			style: { text, size: '14', color: rgb(255, 255, 255), bgcolor: rgb(...color) },
			steps: [{ down: [{ actionId, options }], up: [] }],
			feedbacks: feedbackId ? [{ feedbackId, options: fbOptions ?? {}, style: { bgcolor: rgb(200, 0, 0), color: rgb(255, 255, 255) } }] : [],
		}
	}
	ctl('ticker', 'Ticker de passos (alterna)', 'TICKER\\nPASSOS', COL.ctrl, 'ticker', { mode: 'toggle' }, 'ticker_on')
	ctl('clear_all', 'Neteja-ho tot', 'NETEJA\\nTOT', [150, 0, 0], 'clear_all', { ticker: false })
	for (const [slot, text] of [
		['main', 'TREU\\nCENTRE'],
		['lower', 'TREU\\nINFERIOR'],
		['chrono', 'TREU\\nCRONO'],
		['tag', 'TREU\\nPOSICIÓ'],
		['mini', 'TREU\\nTOP 5'],
		['gauge_speed', 'TREU\\nVELOC.'],
		['gauge_gradient', 'TREU\\nPENDENT'],
	]) {
		ctl(`clear_${slot}`, `Treu la zona: ${SLOTS[slot]}`, text, [80, 20, 20], 'clear_slot', { slot }, 'slot_busy', { slot })
	}
	ctl('sync', 'Sincronitza amb LiveTrail ara', 'SYNC\\nLIVETRAIL', [30, 30, 90], 'sync', { registrants: false })
	ctl('sync_reg', 'Sincronitza i importa inscrits', 'IMPORTA\\nINSCRITS', [30, 30, 90], 'sync', { registrants: true })
	presets.status = {
		type: 'button',
		category: '0 · Control',
		name: 'Estat de la connexió',
		style: { text: `GFX SPORT\\n$(${label}:status_text)`, size: '14', color: rgb(255, 255, 255), bgcolor: rgb(20, 20, 20) },
		steps: [{ down: [], up: [] }],
		feedbacks: [{ feedbackId: 'connected', options: {}, style: { bgcolor: rgb(0, 100, 0) } }],
	}
	return presets
}

module.exports = { SLOTS, shortRace, defaultOptions, sceneOptionFields, buildLayer, layerMatches, slotOf, describeLayer, buildPresets, sceneDef }

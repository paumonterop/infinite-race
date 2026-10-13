// Prova del mòdul sense Companion: s'hi simulen només els mètodes de la classe base i la resta és real
// (HTTP contra el servidor, generació de presets, accions i feedbacks).
//   GFX_HOST=localhost GFX_PORT=3100 GFX_USER=admin GFX_PASS=... GFX_EVENT=<id> node test/run.js
const assert = require('node:assert/strict')
const { combineRgb } = require('@companion-module/base')
const { GfxSportInstance } = require('../src/instance')

const cfg = {
	host: process.env.GFX_HOST || 'localhost',
	port: parseInt(process.env.GFX_PORT || '3100', 10),
	user: process.env.GFX_USER || 'admin',
	password: process.env.GFX_PASS || '',
	eventId: process.env.GFX_EVENT || '',
}

function makeInstance(config) {
	const i = Object.create(GfxSportInstance.prototype)
	Object.assign(i, { config, state: null, eventId: null, bibSel: '', timer: null, stopped: true, connected: false, lastError: '', signature: '' })
	Object.defineProperty(i, 'label', { value: 'gfxsport' })
	i.captured = { actions: null, feedbacks: null, presets: null, variables: {}, status: [] }
	i.updateStatus = (s, m) => i.captured.status.push([s, m])
	i.setVariableDefinitions = () => {}
	i.setVariableValues = (v) => Object.assign(i.captured.variables, v)
	i.setActionDefinitions = (a) => (i.captured.actions = a)
	i.setFeedbackDefinitions = (f) => (i.captured.feedbacks = f)
	i.setPresetDefinitions = (p) => (i.captured.presets = p)
	i.checkFeedbacks = () => {}
	i.log = (lvl, msg) => lvl !== 'debug' && console.log(`   [log ${lvl}] ${msg}`)
	i.parseVariablesInString = async (s) => s
	return i
}

const ok = (m) => console.log(`✔ ${m}`)

;(async () => {
	const inst = makeInstance(cfg)
	await inst.poll() // una lectura
	assert.ok(inst.connected, `no connecta: ${inst.lastError}`)
	ok(`connectat a l'esdeveniment ${inst.eventId} («${inst.state.event.name}»)`)
	const st = inst.state
	console.log(`   curses: ${st.races.map((r) => `${r.id}(${r.checkpoints.length} controls, ${r.segments.length} segments)`).join(', ')} · escenes: ${st.scenes.length} · persones: ${st.others.map((o) => o.name).join(', ')}`)

	// ── definicions ──
	const { actions, feedbacks, presets } = inst.captured
	assert.ok(actions.scene_on && actions.scene_toggle && actions.clear_slot && actions.ticker && actions.clear_all && actions.sync)
	ok(`accions: ${Object.keys(actions).join(', ')}`)
	ok(`feedbacks: ${Object.keys(feedbacks).join(', ')}`)

	// cada preset referencia accions/feedbacks existents amb TOTES les seves opcions
	let nPresets = 0
	const byCat = {}
	for (const [id, p] of Object.entries(presets)) {
		nPresets++
		byCat[p.category] = (byCat[p.category] || 0) + 1
		assert.equal(p.type, 'button', id)
		assert.ok(p.style.text, `${id}: sense text`)
		for (const step of p.steps)
			for (const a of [...step.down, ...step.up]) {
				assert.ok(actions[a.actionId], `${id}: acció desconeguda ${a.actionId}`)
				for (const f of actions[a.actionId].options) {
					if (f.type === 'static-text') continue
					assert.ok(f.id in a.options || f.isVisible, `${id}: falta l'opció ${f.id} de ${a.actionId}`)
				}
			}
		for (const f of p.feedbacks) {
			assert.ok(feedbacks[f.feedbackId], `${id}: feedback desconegut ${f.feedbackId}`)
			assert.ok(f.style?.bgcolor !== undefined, `${id}: feedback sense estil`)
		}
	}
	ok(`${nPresets} presets vàlids`)
	for (const [c, n] of Object.entries(byCat).sort()) console.log(`     ${c}: ${n}`)
	// text dels botons: màxim ~4 línies i línies curtes (Stream Deck 72px)
	for (const [id, p] of Object.entries(presets)) {
		const lines = p.style.text.split('\\n')
		assert.ok(lines.length <= 4, `${id}: massa línies`)
	}
	ok('textos dels botons curts (≤ 4 línies)')

	const run = async (actionId, options) => actions[actionId].callback({ options, id: 'x', controlId: 'y', actionId })
	const layers = () => inst.state.program.layers
	const clean = async () => {
		await run('clear_all', { ticker: true })
		assert.deepEqual(layers(), {})
	}
	await clean()

	// ── accions reals ──
	const race = st.races[0]
	const base = { scene: 'leaderboard_mini', race: race.id, sex: 'M', position: 1, bib: '', segment: '', device: 'auto', point: '', other: '' }
	await run('scene_toggle', base)
	assert.equal(layers().mini.scene, 'leaderboard_mini')
	assert.equal(layers().mini.race_id, race.id)
	ok('toggle posa «classificació petita» en antena (zona mini)')
	assert.equal(feedbacks.scene_on_air.callback({ options: base }), true)
	assert.equal(feedbacks.scene_on_air.callback({ options: { ...base, sex: 'F' } }), false)
	ok("feedback «escena en antena»: sí per Homes, no per Dones")
	await run('scene_toggle', base)
	assert.equal(layers().mini, undefined)
	ok('segon toggle la treu')

	// zones diferents conviuen; la mateixa zona se substitueix
	await run('scene_on', { ...base, scene: 'chrono_all' })
	await run('scene_on', { ...base, scene: 'leaderboard', sex: 'F' })
	await run('scene_on', { ...base, scene: 'race_stats' })
	assert.equal(layers().main.scene, 'race_stats')
	assert.equal(layers().chrono.scene, 'chrono_all')
	ok('zones: race_stats ha substituït la classificació (centre) i el cronòmetre hi segueix')

	// presets de posició (1r–5è) i segments
	const posPreset = presets[`pos_${race.id}_M_1`]
	await run(posPreset.steps[0].down[0].actionId, posPreset.steps[0].down[0].options)
	assert.equal(layers().tag.position, 1)
	ok('preset «1r HOME» → etiqueta de posició en antena')
	const segPreset = Object.entries(presets).find(([id]) => id.startsWith('seg_prof_'))
	if (segPreset) {
		await run(segPreset[1].steps[0].down[0].actionId, segPreset[1].steps[0].down[0].options)
		assert.equal(layers().lower.scene, 'segment_profile')
		assert.ok(layers().lower.to_km > layers().lower.from_km)
		ok(`preset de segment → perfil del tram km ${layers().lower.from_km}–${layers().lower.to_km} («${layers().lower.label}»)`)
	}

	// teclat de dorsal + chyron
	for (const d of '1313') await run('bib_digit', { digit: d })
	assert.equal(inst.bibSel, '1313')
	await run('bib_back', {})
	await run('bib_digit', { digit: '3' })
	const chy = presets[`chyron_${race.id}`]
	await run(chy.steps[0].down[0].actionId, chy.steps[0].down[0].options)
	assert.equal(layers().lower.scene, 'runner_chyron')
	assert.equal(layers().lower.bib, '1313')
	ok('teclat de dorsal 1-3-1-3 + preset de chyron → chyron del dorsal 1313')
	await run('bib_clear', {})
	assert.equal(inst.bibSel, '')
	const before = JSON.stringify(layers().lower)
	await run(chy.steps[0].down[0].actionId, chy.steps[0].down[0].options)
	assert.equal(JSON.stringify(layers().lower), before)
	ok('chyron sense dorsal seleccionat: no fa res (no posa un chyron buit)')

	// persona externa, dials automàtics, ticker
	const other = st.others[0]
	if (other) {
		const op = presets[`other_${other.id}`]
		await run(op.steps[0].down[0].actionId, op.steps[0].down[0].options)
		assert.equal(layers().lower.other, other.id)
		ok(`chyron d'altres: ${other.name} (${other.role})`)
	}
	await run('scene_on', { ...base, scene: 'gps_speed', device: 'auto' })
	await run('scene_on', { ...base, scene: 'gps_gradient', device: 'auto' })
	assert.ok(layers().gauge_speed && layers().gauge_gradient)
	ok('dials de velocitat i pendent (motxilla automàtica) en antena')
	await run('ticker', { mode: 'toggle' })
	assert.equal(inst.state.program.ticker, true)
	assert.equal(feedbacks.ticker_on.callback(), true)
	await run('ticker', { mode: 'off' })
	assert.equal(inst.state.program.ticker, false)
	ok('ticker: alterna i treu')

	// variables
	await run('clear_slot', { slot: 'lower' })
	assert.equal(layers().lower, undefined)
	await inst.poll()
	console.log('   variables:', JSON.stringify(Object.fromEntries(Object.entries(inst.captured.variables).filter(([k]) => k.startsWith('slot_') || ['ticker', 'layers_count', 'bib_sel', 'connected'].includes(k)))))
	await clean()
	ok('estat final net')

	// contrasenya incorrecta: les ordres d'escriptura fallen i l'estat ho diu
	const bad = makeInstance({ ...cfg, password: 'incorrecta' })
	bad.eventId = inst.eventId
	bad.state = JSON.parse(JSON.stringify(inst.state))
	bad.rebuildDefinitions()
	await bad.captured.actions.ticker.callback({ options: { mode: 'on' } })
	const last = bad.captured.status[bad.captured.status.length - 1]
	if (cfg.password) {
		assert.ok(last && /authentication/i.test(String(last[0])), `estat esperat AuthenticationFailure, ha estat ${JSON.stringify(last)}`)
		ok('contrasenya incorrecta → estat «Authentication failure» (cap canvi al programa)')
	}
	console.log('\nTOT OK')
	process.exit(0)
})().catch((e) => {
	console.error('\n✘ ' + (e.stack || e))
	process.exit(1)
})

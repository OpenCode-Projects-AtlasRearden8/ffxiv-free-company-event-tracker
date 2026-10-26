'use strict';

var fs = require('fs');
var path = require('path');

var htmlPath = path.join(__dirname, '..', 'index.html');
var html = fs.readFileSync(htmlPath, 'utf8');

var scriptMatch = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!scriptMatch) {
  console.error('FAIL: could not find a <script> block in index.html');
  process.exit(1);
}
var code = scriptMatch[1];

var mod = { exports: {} };
var documentStub = {
  title: '',
  getElementById: function () { return stubElement(); },
  createElement: function () { return stubElement(); },
  addEventListener: function (type, fn) { captured[type] = fn; },
  body: null
};
var captured = {};
function stubElement() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    dataset: {},
    addEventListener: function () {},
    classList: { add: function () {}, remove: function () {}, toggle: function () {} },
    focus: function () {},
    appendChild: function () {},
    removeChild: function () {},
    click: function () {}
  };
}
documentStub.body = stubElement();

var core;
try {
  var factory = new Function('module', 'exports', 'document', code);
  factory(mod, mod.exports, documentStub);
  core = mod.exports;
} catch (e) {
  console.error('FAIL: extracted script does not compile/run in isolation:');
  console.error(String(e && e.stack || e));
  process.exit(1);
}

var pass = 0;
var fail = 0;
var failures = [];

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('ok   ' + name);
  } catch (e) {
    fail++;
    failures.push({ name: name, error: e });
    console.log('FAIL ' + name);
    console.log('     ' + String(e && e.message || e));
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(got, want, msg) {
  var g = JSON.stringify(got);
  var w = JSON.stringify(want);
  if (g !== w) throw new Error((msg || 'values differ') + ' | got: ' + g + ' | want: ' + w);
}

test('index.html has exactly one script block and no external resources', function () {
  eq((html.match(/<script/g) || []).length, 1, 'script tag count');
  assert(/<script>/.test(html), 'script tag should be plain <script>');
  assert(!/<link/i.test(html), 'link tag found');
  assert(!/src\s*=/i.test(html), 'src attribute found');
  assert(!/https?:\/\//i.test(html), 'absolute URL found');
});

test('weekly recurrence: Tue+Thu raid nights for October 2026', function () {
  var raid = {
    id: 't-raid', name: 'Raid Night', type: 'raid', time: '20:00',
    recurrence: { freq: 'weekly', days: [2, 4] },
    slots: ['Tank', 'Tank', 'Healer', 'Healer', 'DPS', 'DPS', 'DPS', 'DPS']
  };
  var occ = core.expandRecurring([raid], '2026-10-01', '2026-10-31');
  eq(occ.map(function (e) { return e.date; }), [
    '2026-10-01', '2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15',
    '2026-10-20', '2026-10-22', '2026-10-27', '2026-10-29'
  ]);
});

test('biweekly recurrence honors its anchor week (anchor 2026-10-04)', function () {
  var gate = {
    id: 't-gate', name: 'GATE Night', type: 'gate', time: '21:00',
    recurrence: { freq: 'biweekly', days: [6], anchor: '2026-10-04' },
    slots: ['Host', 'Host', 'General', 'General', 'General', 'General']
  };
  var occ = core.expandRecurring([gate], '2026-10-01', '2026-10-31');
  eq(occ.map(function (e) { return e.date; }), ['2026-10-10', '2026-10-24']);
});

test('biweekly recurrence with the default anchor (2026-01-04)', function () {
  var gate = {
    id: 't-gate', name: 'GATE Night', type: 'gate', time: '21:00',
    recurrence: { freq: 'biweekly', days: [6] },
    slots: ['General']
  };
  var occ = core.expandRecurring([gate], '2026-10-01', '2026-10-31');
  eq(occ.map(function (e) { return e.date; }), ['2026-10-03', '2026-10-17', '2026-10-31']);
});

test('monthly recurrence: 3rd Saturday of each month', function () {
  var boot = {
    id: 't-boot', name: 'Bootcamp', type: 'other', time: '19:00',
    recurrence: { freq: 'monthly', days: [6], nth: 3 },
    slots: ['Mentor', 'General']
  };
  var occ = core.expandRecurring([boot], '2026-10-01', '2026-11-30');
  eq(occ.map(function (e) { return e.date; }), ['2026-10-17', '2026-11-21']);
});

test('applyTemplateToDate builds stable ids and indexed role slots', function () {
  var t = { id: 't-craft', name: 'Crafting Corner', type: 'craft', time: '20:00', slots: ['Crafter', 'Gatherer'] };
  var ev = core.applyTemplateToDate(t, '2026-10-07');
  eq(ev.id, 't-craft@2026-10-07');
  eq(ev.templateId, 't-craft');
  eq(ev.date, '2026-10-07');
  eq(ev.slots, [{ index: 0, role: 'Crafter' }, { index: 1, role: 'Gatherer' }]);
});

test('allEvents merges template occurrences and one-off events in order', function () {
  var raid = { id: 't-raid', name: 'Raid Night', type: 'raid', time: '20:00', recurrence: { freq: 'weekly', days: [2] }, slots: ['Tank'] };
  var oneoff = [{ id: 'abc', date: '2026-10-06', name: 'Blitz', type: 'gate', time: '19:00', slots: ['General'] }];
  var evs = core.allEvents([raid], oneoff, '2026-10-05', '2026-10-07');
  eq(evs.map(function (e) { return e.id; }), ['otabc', 't-raid@2026-10-06']);
  eq(evs[0].name, 'Blitz');
  eq(evs[1].time, '20:00');
});

test('role matching: General slots fit anyone, named slots fit their role', function () {
  assert(core.roleMatches('Tank', 'Tank'));
  assert(core.roleMatches('General', 'Tank'));
  assert(core.roleMatches('General', 'General'));
  assert(core.roleMatches('Healer', 'General'));
  assert(!core.roleMatches('Tank', 'DPS'));
  assert(!core.roleMatches('Healer', 'Tank'));
});

test('slot filling fills matching slots in request order', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Tank' }, { index: 2, role: 'Healer' }, { index: 3, role: 'General' }] };
  var res = core.fillSlotRequests(ev, { assigned: {}, waitlist: [] }, [
    { memberId: 'a', role: 'Tank' },
    { memberId: 'b', role: 'DPS' },
    { memberId: 'c', role: 'Healer' },
    { memberId: 'd', role: 'Tank' }
  ]);
  eq(res.assigned, { 0: 'a', 1: 'd', 2: 'c', 3: 'b' });
  eq(res.waitlist, []);
  eq(res.log.map(function (l) { return l.action; }), ['assigned', 'assigned', 'assigned', 'assigned']);
});

test('slot filling waitlists when matching slots are full', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Tank' }] };
  var res = core.fillSlotRequests(ev, { assigned: {}, waitlist: [] }, [
    { memberId: 't1', role: 'Tank' },
    { memberId: 't2', role: 'Tank' },
    { memberId: 't3', role: 'Tank' }
  ]);
  eq(res.assigned, { 0: 't1', 1: 't2' });
  eq(res.waitlist, [{ memberId: 't3', role: 'Tank' }]);
  eq(res.log[2].action, 'waitlisted');
});

test('slot filling ignores duplicate requests for the same member', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }] };
  var res = core.fillSlotRequests(ev, { assigned: {}, waitlist: [] }, [
    { memberId: 'a', role: 'Tank' },
    { memberId: 'a', role: 'Tank' }
  ]);
  eq(res.assigned, { 0: 'a' });
  eq(res.log[1].action, 'duplicate');
});

test('slot filling does not place a member into a role they did not ask for', function () {
  var ev = { slots: [{ index: 0, role: 'Healer' }] };
  var res = core.fillSlotRequests(ev, { assigned: {}, waitlist: [] }, [{ memberId: 'a', role: 'Tank' }]);
  eq(res.assigned, {});
  eq(res.waitlist, [{ memberId: 'a', role: 'Tank' }]);
});

test('removing a member promotes the first waitlisted member who fits', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Tank' }] };
  var st = { assigned: { 0: 'a', 1: 'b' }, waitlist: [{ memberId: 'c', role: 'Tank' }] };
  var res = core.removeAssignment(ev, st, 1);
  eq(res.assigned, { 0: 'a', 1: 'c' });
  eq(res.waitlist, []);
});

test('removing a member does not promote waitlisted members who do not fit', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Healer' }] };
  var st = { assigned: { 0: 'a', 1: 'b' }, waitlist: [{ memberId: 'c', role: 'Healer' }] };
  var res = core.removeAssignment(ev, st, 0);
  eq(res.assigned, { 1: 'b' });
  eq(res.waitlist, [{ memberId: 'c', role: 'Healer' }]);
  var res2 = core.removeAssignment(ev, { assigned: res.assigned, waitlist: res.waitlist }, 1);
  eq(res2.assigned, { 1: 'c' });
  eq(res2.waitlist, []);
});

test('setSlotMember swaps a busy member instead of double-booking', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Healer' }] };
  var st = { assigned: { 0: 'a', 1: 'c' }, waitlist: [] };
  var res = core.setSlotMember(ev, st, 1, 'a');
  eq(res.assigned, { 0: 'c', 1: 'a' });
});

test('setSlotMember clears a slot and auto-fills from the waitlist', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }, { index: 1, role: 'Healer' }] };
  var st = { assigned: { 0: 'a' }, waitlist: [{ memberId: 'd', role: 'Tank' }] };
  var res = core.setSlotMember(ev, st, 0, '');
  eq(res.assigned, { 0: 'd' });
  eq(res.waitlist, []);
});

test('clearing an empty slot changes nothing', function () {
  var ev = { slots: [{ index: 0, role: 'Tank' }] };
  var res = core.setSlotMember(ev, { assigned: {}, waitlist: [] }, 0, '');
  eq(res.assigned, {});
});

test('attendance summary counts only nights marked as held', function () {
  var roster = [
    { id: 'm1', name: 'Iron Cacao' },
    { id: 'm2', name: 'Honey Lemon' },
    { id: 'm3', name: 'Mimosa Tea' }
  ];
  var held = {
    'ev-a': { marked: true, attendees: ['m2', 'm3'] },
    'ev-b': { marked: true, attendees: ['m2'] },
    'ev-c': { marked: false, attendees: ['m1'] }
  };
  var sum = core.attendanceSummary(roster, held);
  eq(sum.totalHeld, 2);
  var byName = {};
  sum.rows.forEach(function (r) { byName[r.name] = r; });
  eq([byName['Honey Lemon'].attended, byName['Honey Lemon'].pct], [2, 100]);
  eq([byName['Mimosa Tea'].attended, byName['Mimosa Tea'].pct], [1, 50]);
  eq([byName['Iron Cacao'].attended, byName['Iron Cacao'].pct], [0, 0]);
});

test('seeded starter schedule is coherent', function () {
  var st = core.seedState();
  eq(st.templates.length, 5);
  var ids = {};
  st.templates.forEach(function (t) { ids[t.id] = true; });
  eq(Object.keys(ids).length, 5, 'template ids should be unique');
  st.templates.forEach(function (t) {
    assert(/^[01]\d|2[0-3]:[0-5]\d$/.test(t.time), 'template time should be HH:MM: ' + t.id);
    assert(t.slots.length >= 1, 'template should have slots: ' + t.id);
    assert(['weekly', 'biweekly', 'monthly'].indexOf(t.recurrence.freq) !== -1, 'freq: ' + t.id);
    if (t.recurrence.freq === 'monthly') eq(t.recurrence.days.length, 1, 'monthly should have one weekday: ' + t.id);
    var occ = core.expandRecurring([t], '2026-10-01', '2027-03-31');
    assert(occ.length >= 3, 'template should produce events: ' + t.id);
  });
  var mids = {};
  st.roster.forEach(function (m) { mids[m.id] = true; });
  eq(Object.keys(mids).length, st.roster.length, 'member ids should be unique');
});

test('UI renders every tab plus an event view from a document stub (smoke)', function () {
  assert(core.ui && typeof core.ui.setTab === 'function', 'ui hooks should be exported');
  var mainEl = stubElement();
  documentStub.getElementById = function (id) {
    if (id === 'main') return mainEl;
    return stubElement();
  };

  var seen = {};
  ['calendar', 'members', 'attendance', 'settings'].forEach(function (tab) {
    core.ui.setTab(tab);
    seen[tab] = mainEl.innerHTML;
  });
  assert(seen.calendar.indexOf('Events this month') !== -1, 'calendar should render');
  assert(seen.members.indexOf('Members (') !== -1, 'members should render');
  assert(seen.attendance.indexOf('Attendance history') !== -1, 'attendance should render');
  assert(seen.settings.indexOf('Recurring event templates') !== -1, 'settings should render');

  core.ui.setTab('calendar');
  var evs = core.allEvents(core.ui.state().templates, core.ui.state().onetime, '2026-10-01', '2026-10-31');
  assert(evs.length > 0, 'seed schedule should expand to events');
  core.ui.openEvent(evs[0].id);
  var evHtml = mainEl.innerHTML;
  assert(evHtml.indexOf('Signup grid') !== -1, 'event view should render signup grid');
  assert(evHtml.indexOf('Waitlist') !== -1, 'event view should render waitlist');
  assert(evHtml.indexOf('Lead-only notes') === -1, 'notes stay hidden when lead mode is off');

  core.ui.state().leadMode = true;
  core.ui.openEvent(evs[0].id);
  assert(mainEl.innerHTML.indexOf('Lead-only notes') !== -1, 'notes appear in lead mode');
  core.ui.state().leadMode = false;
});

test('UI event wiring: adding a member and a signup through dispatched clicks', function () {
  var click = captured['click'];
  assert(typeof click === 'function', 'click listener should be registered');
  var mainEl = stubElement();
  documentStub.getElementById = function (id) {
    if (id === 'main') return mainEl;
    if (id === 'new-member-name') { var e1 = stubElement(); e1.value = 'Test Member'; return e1; }
    if (id === 'as-member') { var e2 = stubElement(); e2.value = 'm1'; return e2; }
    if (id === 'as-role') { var e3 = stubElement(); e3.value = 'Tank'; return e3; }
    return stubElement();
  };
  function fakeClick(action, ds) {
    var target = { dataset: Object.assign({ action: action }, ds || {}) };
    target.closest = function () { return target; };
    click({ target: target });
  }

  fakeClick('member-add');
  var names = core.ui.state().roster.map(function (m) { return m.name; });
  assert(names.indexOf('Test Member') !== -1, 'member should be added to the roster');

  var evs = core.allEvents(core.ui.state().templates, core.ui.state().onetime, '2026-10-01', '2026-10-31');
  var raid = null;
  evs.forEach(function (e) { if (e.id === 't-raid-a@2026-10-06') raid = e; });
  assert(raid, 'raid occurrence should exist');

  fakeClick('signup-add', { id: raid.id });
  var stt = core.ui.state().signups[raid.id];
  assert(stt && stt.assigned['0'] === 'm1', 'signup should fill slot 0 with member m1');
});

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail > 0) {
  process.exit(1);
}

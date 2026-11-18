// src/mock/db.js
// ---------------------------------------------------------------------------
// MOCK BACKEND DATA — development only.
// Simulates what Member 2's Express API + PostgreSQL + Jira would return, so
// the UI can be built and tested before real endpoints exist. Data is kept in
// localStorage so it survives page reloads. Reset it with resetMockDb() or by
// clearing the "campuscare_mock_db" key in the browser's storage.
// Nothing here is used when VITE_USE_MOCK_API=false.
// ---------------------------------------------------------------------------
import { MOCK_LATENCY_MS } from '../config/env';
import { ApiError } from '../utils/errors';
import { tokenStorage } from '../utils/tokenStorage';

const STORAGE_KEY = 'campuscare_mock_db_v1';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const delay = (ms = MOCK_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const mockError = (status, message, code = null) => new ApiError(message, { status, code });

// Blob URLs for files uploaded in this browser session (not persisted).
export const blobUrls = {};

// ---------------------------------------------------------------- seed data
const uuidFor = (n) => `5b2f8c1e-4d3a-4c6b-9e7f-${n.toString(16).padStart(12, '0')}`;
const qrTokenFor = (n) => `qr-${(n * 7919 + 104729).toString(36)}`;

function buildSeed() {
  const now = Date.now();
  const ago = (ms) => new Date(now - ms).toISOString();

  const teachers = [
    {
      id: 't1',
      email: 'teacher@college.edu',
      password: 'password123', // mock only
      accountStatus: 'ACTIVE',
      fullName: 'Prof. Anjali Deshmukh',
      phone: '9820012345',
      department: 'Computer Engineering',
      designation: 'Assistant Professor',
      avatarUrl: null,
    },
    {
      id: 't2',
      email: 'other.teacher@college.edu',
      password: 'password123',
      accountStatus: 'ACTIVE',
      fullName: 'Prof. Rahul Mehta',
      phone: '9819098765',
      department: 'Information Technology',
      designation: 'Associate Professor',
      avatarUrl: null,
    },
    {
      id: 't3',
      email: 'pending.teacher@college.edu',
      password: 'password123',
      accountStatus: 'PENDING',
      fullName: 'Prof. Sneha Kulkarni',
      phone: '',
      department: 'Electronics & Telecommunication',
      designation: 'Assistant Professor',
      avatarUrl: null,
    },
  ];

  const blocks = [
    { id: 'blk-a', name: 'Block A' },
    { id: 'blk-b', name: 'Block B' },
  ];

  const rooms = [
    { id: 'room-522', blockId: 'blk-a', lab: 'Computer Lab 1', room: '522', code: 'A', pcCount: 20 },
    { id: 'room-523', blockId: 'blk-a', lab: 'Computer Lab 2', room: '523', code: 'B', pcCount: 16 },
    { id: 'room-610', blockId: 'blk-b', lab: 'Networking Lab', room: '610', code: 'N', pcCount: 12 },
    { id: 'room-614', blockId: 'blk-b', lab: 'AI & Data Science Lab', room: '614', code: 'D', pcCount: 12 },
  ];

  const special = {
    '523-4': {
      status: 'UNDER_MAINTENANCE',
      notice: 'RAM upgrade scheduled this week.',
    },
    '610-2': {
      status: 'NOT_IN_SERVICE',
      notice: 'Awaiting replacement motherboard.',
    },
    '610-9': {
      status: 'NOT_IN_SERVICE',
      notice: 'This PC has been removed from the lab. Please speak to the lab technician directly.',
      canReport: false,
    },
  };

  const pcs = [];
  let seq = 0;
  rooms.forEach((r) => {
    for (let n = 1; n <= r.pcCount; n += 1) {
      seq += 1;
      const extra = special[`${r.room}-${n}`] || {};
      pcs.push({
        id: uuidFor(seq),
        qrToken: qrTokenFor(seq),
        roomId: r.id,
        pcNumber: n,
        // The backend generates display codes; the format may change.
        displayCode: `${r.room}/${r.code}/${n}`,
        status: extra.status || 'WORKING',
        notice: extra.notice || null,
        canReport: extra.canReport !== false,
      });
    }
  });

  const pcByCode = (code) => pcs.find((p) => p.displayCode === code).id;

  let eventSeq = 0;
  const ev = (type, msAgo, note = null, actor = null) => ({
    id: `ev-${(eventSeq += 1)}`,
    type,
    at: ago(msAgo),
    note,
    actor,
  });
  let commentSeq = 0;
  const tech = { id: 'tech-1', name: 'Suresh Patil (Lab Technician)', role: 'TECHNICIAN' };
  const comment = (msAgo, author, body, visibility = 'PUBLIC', attachmentIds = []) => ({
    id: `c-${(commentSeq += 1)}`,
    author,
    body,
    createdAt: ago(msAgo),
    visibility,
    attachmentIds,
  });
  const me = { id: 't1', name: 'Prof. Anjali Deshmukh', role: 'TEACHER' };

  const T = (data) => ({
    remarks: '',
    participantIds: [data.reporterId],
    attachmentIds: [],
    comments: [],
    verification: null,
    updatedAt: data.events[data.events.length - 1].at,
    createdAt: data.events[0].at,
    ...data,
  });

  const tickets = [
    T({
      id: 'LAB-1012',
      reporterId: 't1',
      pcId: pcByCode('522/A/12'),
      categoryId: 'cat-display',
      subcategoryId: 'sub-flickering',
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      description: 'Monitor flickers every few seconds and sometimes goes black for a moment. Students cannot read the screen.',
      remarks: 'Happens more after the PC has been on for 30+ minutes.',
      attachmentIds: ['att-1'],
      events: [ev('SUBMITTED', 2 * DAY), ev('ACKNOWLEDGED', 2 * DAY - 2 * HOUR), ev('IN_PROGRESS', DAY)],
      comments: [
        comment(DAY, tech, 'Checked the VGA cable and swapped it, the flicker continues. A replacement monitor has been requested.'),
        comment(DAY - HOUR, tech, 'INTERNAL: monitor is under AMC, raise vendor ticket V-889 before replacing.', 'INTERNAL'),
      ],
    }),
    T({
      id: 'LAB-1011',
      reporterId: 't1',
      pcId: pcByCode('523/B/7'),
      categoryId: 'cat-input',
      subcategoryId: 'sub-keyboard',
      urgency: 'MEDIUM',
      status: 'WAITING_FOR_INFO',
      description: 'Several keys on the keyboard are not typing.',
      events: [
        ev('SUBMITTED', DAY + 4 * HOUR),
        ev('ACKNOWLEDGED', DAY + 3 * HOUR),
        ev('IN_PROGRESS', DAY),
        ev('WAITING_FOR_INFO', 20 * HOUR, 'Technician asked for more details.'),
      ],
      comments: [
        comment(20 * HOUR, tech, 'Is it all keys or only some (for example the number row)? A photo of the keyboard would help.'),
        comment(20 * HOUR - MINUTE * 5, tech, 'INTERNAL: likely liquid spill, check stock for spare keyboards.', 'INTERNAL'),
      ],
    }),
    T({
      id: 'LAB-1010',
      reporterId: 't1',
      pcId: pcByCode('610/N/5'),
      categoryId: 'cat-network',
      subcategoryId: 'sub-no-internet',
      urgency: 'CRITICAL',
      status: 'AWAITING_VERIFICATION',
      description: 'No internet on any PC in the Networking Lab. Practical session had to be stopped.',
      remarks: 'Affects the whole of room 610.',
      events: [
        ev('SUBMITTED', 3 * DAY),
        ev('ACKNOWLEDGED', 3 * DAY - 30 * MINUTE),
        ev('IN_PROGRESS', 3 * DAY - 2 * HOUR),
        ev('FIXED', 3 * HOUR, 'Network switch replaced.'),
        ev('AWAITING_VERIFICATION', 2 * HOUR),
      ],
      comments: [
        comment(3 * HOUR, tech, 'The network switch in rack 2 has been replaced. All PCs in 610 should now be online. Please confirm.'),
        comment(3 * HOUR - MINUTE, tech, 'INTERNAL: old switch sent for RMA, serial SW-22841.', 'INTERNAL'),
      ],
    }),
    T({
      id: 'LAB-1009',
      reporterId: 't1',
      pcId: pcByCode('522/A/3'),
      categoryId: 'cat-power',
      subcategoryId: 'sub-not-starting',
      urgency: 'HIGH',
      status: 'FIXED',
      description: 'PC does not power on. No lights on the cabinet.',
      events: [
        ev('SUBMITTED', 5 * DAY),
        ev('ACKNOWLEDGED', 5 * DAY - HOUR),
        ev('IN_PROGRESS', 4 * DAY),
        ev('FIXED', DAY, 'Power supply replaced.'),
      ],
      comments: [comment(DAY, tech, 'Replaced the SMPS. The PC is booting normally now.')],
    }),
    T({
      id: 'LAB-1008',
      reporterId: 't1',
      pcId: pcByCode('614/D/8'),
      categoryId: 'cat-software',
      subcategoryId: 'sub-app-not-opening',
      urgency: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      description: 'MATLAB fails to launch and shows a licence error.',
      events: [ev('SUBMITTED', 6 * HOUR), ev('ACKNOWLEDGED', 5 * HOUR)],
    }),
    T({
      id: 'LAB-1007',
      reporterId: 't1',
      pcId: pcByCode('522/A/12'),
      categoryId: 'cat-power',
      subcategoryId: 'sub-sudden-shutdown',
      urgency: 'MEDIUM',
      status: 'SUBMITTED',
      description: 'PC shuts down on its own during heavy programs.',
      events: [ev('SUBMITTED', 3 * HOUR)],
    }),
    T({
      id: 'LAB-1006',
      reporterId: 't1',
      pcId: pcByCode('523/B/2'),
      categoryId: 'cat-peripheral',
      subcategoryId: 'sub-speakers',
      urgency: 'LOW',
      status: 'CLOSED',
      description: 'No sound from the speakers.',
      events: [
        ev('SUBMITTED', 12 * DAY),
        ev('ACKNOWLEDGED', 12 * DAY - HOUR),
        ev('IN_PROGRESS', 11 * DAY),
        ev('FIXED', 11 * DAY - 3 * HOUR),
        ev('AWAITING_VERIFICATION', 11 * DAY - 3 * HOUR),
        ev('VERIFIED', 10 * DAY, 'Teacher confirmed the PC is working.', me),
        ev('CLOSED', 10 * DAY),
      ],
      comments: [comment(11 * DAY - 3 * HOUR, tech, 'Speaker cable was loose. Reconnected.')],
      verification: { result: 'WORKING', comment: 'Working fine now, thank you!', rating: 5, at: ago(10 * DAY) },
    }),
    T({
      id: 'LAB-1005',
      reporterId: 't1',
      pcId: pcByCode('614/D/3'),
      categoryId: 'cat-display',
      subcategoryId: 'sub-no-display',
      urgency: 'HIGH',
      status: 'REOPENED',
      description: 'Monitor shows "No signal" even though the PC is on.',
      events: [
        ev('SUBMITTED', 9 * DAY),
        ev('ACKNOWLEDGED', 9 * DAY - HOUR),
        ev('IN_PROGRESS', 8 * DAY),
        ev('FIXED', 3 * DAY, 'Graphics card reseated.'),
        ev('AWAITING_VERIFICATION', 3 * DAY),
        ev('REOPENED', 2 * DAY, 'Teacher reported the problem is still there.', me),
      ],
      comments: [
        comment(3 * DAY, tech, 'Reseated the graphics card, display is working.'),
        comment(2 * DAY, me, 'The screen still goes blank after about 10 minutes of use.'),
      ],
      verification: {
        result: 'NOT_WORKING',
        explanation: 'The screen still goes blank after about 10 minutes of use.',
        comment: '',
        rating: null,
        at: ago(2 * DAY),
      },
    }),
    T({
      id: 'LAB-1004',
      reporterId: 't1',
      pcId: pcByCode('610/N/2'),
      categoryId: 'cat-other',
      subcategoryId: null,
      urgency: 'LOW',
      status: 'CLOSED',
      description: 'CPU fan is extremely loud and disturbs the class.',
      events: [
        ev('SUBMITTED', 20 * DAY),
        ev('ACKNOWLEDGED', 20 * DAY - HOUR),
        ev('IN_PROGRESS', 19 * DAY),
        ev('FIXED', 18 * DAY),
        ev('AWAITING_VERIFICATION', 18 * DAY),
        ev('VERIFIED', 17 * DAY, null, me),
        ev('CLOSED', 17 * DAY),
      ],
      verification: { result: 'WORKING', comment: '', rating: 4, at: ago(17 * DAY) },
    }),
    T({
      id: 'LAB-1003',
      reporterId: 't1',
      pcId: pcByCode('522/A/7'),
      categoryId: 'cat-software',
      subcategoryId: 'sub-software-error',
      urgency: 'LOW',
      status: 'CLOSED',
      description: 'Code::Blocks compiler path error when building any project.',
      events: [
        ev('SUBMITTED', 30 * DAY),
        ev('ACKNOWLEDGED', 30 * DAY - HOUR),
        ev('IN_PROGRESS', 29 * DAY),
        ev('FIXED', 29 * DAY - 2 * HOUR),
        ev('AWAITING_VERIFICATION', 29 * DAY - 2 * HOUR),
        ev('VERIFIED', 28 * DAY, null, me),
        ev('CLOSED', 28 * DAY),
      ],
      verification: { result: 'WORKING', comment: '', rating: null, at: ago(28 * DAY) },
    }),
    T({
      id: 'LAB-1002',
      reporterId: 't1',
      pcId: pcByCode('523/B/11'),
      categoryId: 'cat-network',
      subcategoryId: 'sub-lan',
      urgency: 'MEDIUM',
      status: 'CLOSED',
      description: 'LAN cable shows disconnected. Network icon has a red cross.',
      events: [
        ev('SUBMITTED', 40 * DAY),
        ev('ACKNOWLEDGED', 40 * DAY - HOUR),
        ev('IN_PROGRESS', 39 * DAY),
        ev('FIXED', 39 * DAY - HOUR),
        ev('AWAITING_VERIFICATION', 39 * DAY - HOUR),
        ev('VERIFIED', 38 * DAY, null, me),
        ev('CLOSED', 38 * DAY),
      ],
      verification: { result: 'WORKING', comment: 'Fixed quickly.', rating: 5, at: ago(38 * DAY) },
    }),
    // ---- Another teacher's requests (must never be visible to t1) ----
    T({
      id: 'LAB-1013',
      reporterId: 't2',
      pcId: pcByCode('522/A/12'),
      categoryId: 'cat-input',
      subcategoryId: 'sub-mouse',
      urgency: 'LOW',
      status: 'ACKNOWLEDGED',
      description: 'Mouse pointer jumps around randomly.',
      events: [ev('SUBMITTED', 5 * HOUR), ev('ACKNOWLEDGED', 4 * HOUR)],
    }),
    T({
      id: 'LAB-1014',
      reporterId: 't2',
      pcId: pcByCode('610/N/7'),
      categoryId: 'cat-software',
      subcategoryId: 'sub-software-error',
      urgency: 'MEDIUM',
      status: 'IN_PROGRESS',
      description: 'Packet Tracer crashes on launch.',
      events: [ev('SUBMITTED', 2 * DAY), ev('ACKNOWLEDGED', 2 * DAY - HOUR), ev('IN_PROGRESS', DAY)],
    }),
    T({
      id: 'LAB-1001',
      reporterId: 't2',
      pcId: pcByCode('614/D/1'),
      categoryId: 'cat-display',
      subcategoryId: 'sub-distorted',
      urgency: 'LOW',
      status: 'CLOSED',
      description: 'Colours on the screen look washed out.',
      events: [ev('SUBMITTED', 45 * DAY), ev('CLOSED', 44 * DAY)],
    }),
  ];

  const attachments = {
    'att-1': {
      id: 'att-1',
      name: 'monitor-flicker.mp4',
      mimeType: 'video/mp4',
      size: 4404019,
      url: null, // seed files have no real content
      ownerId: 't1',
    },
  };

  let notifSeq = 0;
  const N = (teacherId, type, ticketId, title, message, msAgo, read) => ({
    id: `n-${(notifSeq += 1)}`,
    teacherId,
    type,
    ticketId,
    title,
    message,
    createdAt: ago(msAgo),
    read,
  });

  const notifications = [
    N('t1', 'VERIFICATION_PENDING', 'LAB-1010', 'Please verify the repair', 'LAB-1010 on PC 610/N/5 is ready for your verification.', 2 * HOUR, false),
    N('t1', 'INFO_REQUESTED', 'LAB-1011', 'Technician needs more information', 'Reply on LAB-1011 so the technician can continue.', 20 * HOUR, false),
    N('t1', 'TICKET_FIXED', 'LAB-1009', 'Marked as fixed', 'The technician marked LAB-1009 on PC 522/A/3 as fixed.', DAY, false),
    N('t1', 'TICKET_ACKNOWLEDGED', 'LAB-1008', 'Request acknowledged', 'LAB-1008 has been acknowledged by the lab team.', 5 * HOUR, true),
    N('t1', 'TICKET_SUBMITTED', 'LAB-1007', 'Request submitted', 'LAB-1007 was submitted successfully.', 3 * HOUR, true),
    N('t1', 'TICKET_REOPENED', 'LAB-1005', 'Request reopened', 'LAB-1005 was reopened after your feedback.', 2 * DAY, true),
    N('t1', 'TICKET_CLOSED', 'LAB-1006', 'Request closed', 'LAB-1006 is closed. Thank you for verifying.', 10 * DAY, true),
    N('t2', 'TICKET_ACKNOWLEDGED', 'LAB-1013', 'Request acknowledged', 'LAB-1013 has been acknowledged.', 4 * HOUR, false),
  ];

  return {
    version: 1,
    teachers,
    blocks,
    rooms,
    pcs,
    tickets,
    attachments,
    notifications,
    idempotency: {},
    nextTicketNumber: 1015,
    seq: 100,
  };
}

// ---------------------------------------------------------------- storage
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

let db = load() || buildSeed();

export function getDb() {
  return db;
}

export function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full or unavailable: data stays in memory */
  }
}

export function resetMockDb() {
  db = buildSeed();
  saveDb();
}

export function nextId(prefix) {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}

saveDb();

// Handy while testing: run `campuscareResetMock()` in the browser console.
if (typeof window !== 'undefined') {
  window.campuscareResetMock = () => {
    resetMockDb();
    window.location.reload();
  };
}

// ---------------------------------------------------------------- helpers
export function currentTeacher() {
  const token = tokenStorage.get();
  const id = token && token.startsWith('mock-token-') ? token.slice('mock-token-'.length) : null;
  const teacher = id && db.teachers.find((t) => t.id === id && t.accountStatus === 'ACTIVE');
  if (!teacher) throw mockError(401, 'Your session has expired. Please sign in again.');
  return teacher;
}

export function teacherDto(t) {
  return {
    id: t.id,
    fullName: t.fullName,
    name: t.fullName,
    email: t.email,
    phone: t.phone,
    department: t.department,
    designation: t.designation,
    avatarUrl: t.avatarUrl,
  };
}

export function pcDto(pc) {
  if (!pc) return null;
  const room = db.rooms.find((r) => r.id === pc.roomId);
  const block = room && db.blocks.find((b) => b.id === room.blockId);
  return {
    id: pc.id,
    displayCode: pc.displayCode,
    block: block?.name || null,
    lab: room?.lab || null,
    room: room?.room || null,
    pcNumber: pc.pcNumber,
    status: pc.status,
    notice: pc.notice,
    canReport: pc.canReport,
  };
}

export function attachmentDto(id) {
  const a = db.attachments[id];
  if (!a) return null;
  return { id: a.id, name: a.name, mimeType: a.mimeType, size: a.size, url: blobUrls[a.id] || a.url || null };
}

export function addNotification(teacherId, type, ticketId, title, message) {
  db.notifications.unshift({
    id: nextId('n'),
    teacherId,
    type,
    ticketId,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

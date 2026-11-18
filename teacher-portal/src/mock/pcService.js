// src/mock/pcService.js
// Mock PC inventory lookups — development only. In real mode the PC list,
// rooms and display codes come from the backend (managed by the admin team).
import { delay, getDb, mockError, pcDto, currentTeacher } from './db';
import { ticketListItemDto, canSeeTicket } from './ticketService';

export const mockPcService = {
  async lookupByQrToken(token) {
    await delay();
    const pc = getDb().pcs.find((p) => p.qrToken === String(token).trim());
    if (!pc) throw mockError(404, "This QR code isn't linked to any lab PC.", 'QR_NOT_FOUND');
    return pcDto(pc);
  },

  async getBlocks() {
    await delay(250);
    return getDb().blocks.map((b) => ({ id: b.id, name: b.name }));
  },

  async getRooms(blockId) {
    await delay(250);
    return getDb()
      .rooms.filter((r) => r.blockId === blockId)
      .map((r) => ({ id: r.id, lab: r.lab, room: r.room, label: `${r.lab} · Room ${r.room}` }));
  },

  async getPcs(roomId) {
    await delay(300);
    return getDb()
      .pcs.filter((p) => p.roomId === roomId)
      .sort((a, b) => a.pcNumber - b.pcNumber)
      .map(pcDto);
  },

  async getPc(pcId) {
    await delay(250);
    const pc = getDb().pcs.find((p) => p.id === pcId);
    if (!pc) throw mockError(404, 'This PC could not be found. It may have been removed.', 'PC_NOT_FOUND');
    return pcDto(pc);
  },

  /** Active tickets on a PC. Other teachers' tickets are returned with limited details. */
  async getActiveTickets(pcId) {
    await delay(300);
    const me = currentTeacher();
    return getDb()
      .tickets.filter((t) => t.pcId === pcId && t.status !== 'CLOSED')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((t) => ticketListItemDto(t, me.id, { limited: !canSeeTicket(t, me.id) }));
  },
};

/**
 * CampusCare PC & Location Service
 * Business logic layer for laboratory locations, computers, QR lookups, and active tickets
 */
const pcRepository = require('../repositories/pcRepository');

/**
 * Maps raw database PC row to client-facing DTO
 * Coordinated with Member 1 (Teacher Portal) & Member 4 (Admin Dashboard)
 */
const formatPcDto = (pc) => {
  if (!pc) return null;
  return {
    id: pc.id,
    displayCode: pc.display_code,
    block: pc.block_name || null,
    blockId: pc.block_id || null,
    lab: pc.lab_name || null,
    labId: pc.lab_id || null,
    room: pc.room_number || null,
    pcNumber: pc.pc_number,
    status: pc.status,
    notice: pc.notice || null,
    canReport: Boolean(pc.can_report),
    assetId: pc.asset_id || null,
    createdAt: pc.created_at,
    updatedAt: pc.updated_at,
  };
};

/**
 * Maps raw lab row to client-facing DTO
 */
const formatLabDto = (lab) => {
  if (!lab) return null;
  return {
    id: lab.id,
    blockId: lab.block_id,
    blockName: lab.block_name || null,
    lab: lab.lab_name,
    room: lab.room_number,
    label: `${lab.lab_name} · Room ${lab.room_number}`,
    code: lab.code,
    pcCount: lab.pc_count,
  };
};

/**
 * Maps raw block row to client-facing DTO
 */
const formatBlockDto = (block) => {
  if (!block) return null;
  return {
    id: block.id,
    name: block.name,
    description: block.description || null,
    createdAt: block.created_at,
  };
};

/**
 * Formats an active ticket row with privacy rules
 * Teachers can only see full details of their own tickets
 * Other teachers' tickets are masked to prevent privacy leakage
 */
const formatActiveTicketDto = (ticket, currentUserId, userRole) => {
  const isOwn = String(ticket.reporter_id) === String(currentUserId);
  const isAdmin = ['ADMIN', 'TECHNICIAN', 'LAB_ASSISTANT'].includes(String(userRole || '').toUpperCase());
  const canView = isOwn || isAdmin;

  const base = {
    id: ticket.id,
    status: ticket.status,
    urgency: ticket.urgency,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    category: ticket.category_id
      ? {
          id: ticket.category_id,
          code: ticket.category_code,
          name: ticket.category_name,
        }
      : null,
    subcategory: ticket.subcategory_id
      ? {
          id: ticket.subcategory_id,
          name: ticket.subcategory_name,
        }
      : null,
    pc: {
      id: ticket.pc_id,
      displayCode: ticket.display_code,
      pcNumber: ticket.pc_number,
      block: ticket.block_name,
      lab: ticket.lab_name,
      room: ticket.room_number,
    },
    isOwn,
    canView,
  };

  // Only include description summary if user is owner or admin
  if (canView) {
    const summary = String(ticket.description || '');
    return {
      ...base,
      summary: summary.length > 90 ? `${summary.slice(0, 89).trimEnd()}…` : summary,
      description: ticket.description,
    };
  }

  return base;
};

/**
 * Service: Get all blocks
 */
const getBlocks = async () => {
  const blocks = await pcRepository.findAllBlocks();
  return blocks.map(formatBlockDto);
};

/**
 * Service: Get all labs / rooms
 */
const getLabs = async (blockId = null) => {
  const labs = await pcRepository.findAllLabs(blockId);
  return labs.map(formatLabDto);
};

/**
 * Service: Get PCs with optional filtering
 */
const getPcs = async (filters = {}) => {
  const pcs = await pcRepository.findAllPcs(filters);
  return pcs.map(formatPcDto);
};

/**
 * Service: Get single PC details
 */
const getPcById = async (pcId) => {
  const pc = await pcRepository.findPcById(pcId);
  if (!pc) {
    const error = new Error('This PC could not be found. It may have been removed or is inactive.');
    error.statusCode = 404;
    error.code = 'PC_NOT_FOUND';
    throw error;
  }
  return formatPcDto(pc);
};

/**
 * Service: Lookup PC using QR token
 */
const getPcByQrToken = async (qrToken) => {
  const cleanToken = String(qrToken || '').trim();
  if (!cleanToken) {
    const error = new Error('A QR token is required for lookup.');
    error.statusCode = 400;
    error.code = 'QR_TOKEN_REQUIRED';
    throw error;
  }

  const pc = await pcRepository.findPcByQrToken(cleanToken);
  if (!pc) {
    const error = new Error("This QR code isn't linked to any active lab PC.");
    error.statusCode = 404;
    error.code = 'QR_NOT_FOUND';
    throw error;
  }

  return formatPcDto(pc);
};

/**
 * Service: Get active tickets for a PC with privacy protection
 */
const getActiveTicketsForPc = async (pcId, currentUserId, userRole) => {
  // Check PC exists first
  await getPcById(pcId);

  const rawTickets = await pcRepository.findActiveTicketsByPcId(pcId);
  return rawTickets.map((t) => formatActiveTicketDto(t, currentUserId, userRole));
};

module.exports = {
  getBlocks,
  getLabs,
  getPcs,
  getPcById,
  getPcByQrToken,
  getActiveTicketsForPc,
  formatPcDto,
  formatLabDto,
  formatBlockDto,
};

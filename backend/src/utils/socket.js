let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const emitToTenant = (tenantId, event, payload) => {
  if (!ioInstance || !tenantId) return;
  ioInstance.to(`tenant:${tenantId}`).emit(event, payload);
};

module.exports = { setIO, getIO, emitToTenant };

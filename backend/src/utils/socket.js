// File for exposing Socket.IO instance to other modules

// Socket.IO will be initialized in index.js and set here
let io;

// Function to set the Socket.IO instance
const setIo = (socketIo) => {
    io = socketIo;
};

// Export both the io instance and the setter function
module.exports = {
    io: () => io,
    setIo
};
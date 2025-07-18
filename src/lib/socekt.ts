let globalSocket : WebSocket | null;

export function getSocket(socket?: WebSocket){
  console.log("CHECK SOCKET STATUS", socket?.readyState, socket?.CLOSED)
  if (socket) {
    globalSocket = socket;
  }
  return globalSocket;
};

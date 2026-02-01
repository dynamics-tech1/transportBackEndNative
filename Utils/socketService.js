import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import validateJWT from "../utils/JWT/ValidateJWT";
import API_URL_AXIOS from "./AxiosServices";
import store from "../Redux/store/Store";
import { setIsLoading } from "../Redux/Slices/driverSlice";

let socket = null;

const getSocketUrl = async () => {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("No token found");
  }

  const validateData = validateJWT(token);
  const phoneNumber = validateData?.phoneNumber;

  if (!phoneNumber) {
    throw new Error("Please add your phone number in your profile");
  }
  return `${API_URL_AXIOS}?user=driver&phoneNumber=${phoneNumber}&token=Bearer%20${token}`;
};

export const initSocket = async () => {
  if (socket && socket?.connected) {
    return;
  }
  store.dispatch(setIsLoading(true));
  const SOCKET_URL = await getSocketUrl();

  socket = io(SOCKET_URL, {
    transports: ["websocket"], // Ensures reliable connection in React Native
    autoConnect: true, // Allow auto connection when needed
  });
  store.dispatch(setIsLoading(false));

  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
  }
};

export const emitEvent = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
  }
};

export const listenToEvent = (event, callback) => {
  if (!socket) {
    return;
  }

  socket.on(event, callback);
};

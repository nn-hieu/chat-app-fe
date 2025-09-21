import type { ApiResponse, LoginRequest, LoginResponse } from "../types/type";
import api from "./api.service";

export const authAPI = {
  login: (request: LoginRequest) => 
    api.post<ApiResponse<LoginResponse>>('/auth/login', request),
};
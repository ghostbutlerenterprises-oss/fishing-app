import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
          },
          });

          // Add JWT token to request headers
          apiClient.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                    if (token) {
                          config.headers.Authorization = `Bearer ${token}`;
                              }
                                  return config;
                                    },
                                      (error) => Promise.reject(error)
                                      );

                                      // Handle auth errors
                                      apiClient.interceptors.response.use(
                                        (response) => response,
                                          (error) => {
                                              if (error.response?.status === 401) {
                                                    localStorage.removeItem('token');
                                                          window.location.href = '/login';
                                                              }
                                                                  return Promise.reject(error);
                                                                    }
                                                                    );

                                                                    export const catchesAPI = {
                                                                      getAll: () => apiClient.get('/catches').then((res) => res.data),
                                                                        getById: (id) => apiClient.get(`/catches/${id}`).then((res) => res.data),
                                                                          create: (data) => apiClient.post('/catches', data).then((res) => res.data),
                                                                            update: (id, data) => apiClient.put(`/catches/${id}`, data).then((res) => res.data),
                                                                              delete: (id) => apiClient.delete(`/catches/${id}`).then((res) => res.data),
                                                                                uploadPhoto: (catchId, photoFile) => {
                                                                                    const formData = new FormData();
                                                                                        formData.append('photo', photoFile);
                                                                                            return apiClient.post(`/catches/${catchId}/photo`, formData, {
                                                                                                  headers: { 'Content-Type': 'multipart/form-data' },
                                                                                                      }).then((res) => res.data);
                                                                                                        },
                                                                                                        };

                                                                                                        export default apiClient;
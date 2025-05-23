import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://backend:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
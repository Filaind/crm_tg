import axios from 'axios';

export const request = axios.create({
    baseURL: "https://api2.wbprod.ru/crm",
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const localRequest = axios.create({
    baseURL: "http://127.0.0.1:2001/",
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

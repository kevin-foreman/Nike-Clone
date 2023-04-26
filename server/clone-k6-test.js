import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    duration: '1m',
    vus: 5,
};

export default function firstTest() {
    const url = 'http://localhost:8000/api/shoes';

    http.get(url);
    sleep(1)
};


async function testLogin() {
    try {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3003';
        const url = new URL('/api/auth/login', baseUrl).toString();
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testLogin();

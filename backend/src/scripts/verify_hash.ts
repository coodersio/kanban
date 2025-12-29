import bcrypt from 'bcrypt';

const hash = '$2b$10$l5JaYtlfk4nP2lReY7C4PeSCTan6/bL9rj7TCc9B9HXMnas3Obfre';

const check = async () => {
    const isPassword = await bcrypt.compare('password', hash);
    const isAdmin123 = await bcrypt.compare('admin123', hash);

    console.log('Is "password"?', isPassword);
    console.log('Is "admin123"?', isAdmin123);
};

check();

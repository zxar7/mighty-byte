// Function to generate a random 10-character code
const randomCodeGenerator = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const code = Array(10).fill('').map(() => characters[Math.floor(Math.random() * characters.length)]);
    return code.join('');
};

// Function to create a unique code that doesn't exist in the current dataset
const createUniqueCode = (jsonKeys) => {
    let newCode = randomCodeGenerator();
    while (jsonKeys.includes(newCode)) {
        newCode = randomCodeGenerator();
    }
    return newCode;
};

module.exports = { randomCodeGenerator, createUniqueCode };
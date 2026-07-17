import jwt from "jsonwebtoken";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";
/* -------- ACCESS TOKEN -------- */
export const generateAccessToken = (payload, expiresInOverride) => {
    return jwt.sign(payload, ACCESS_SECRET, {
        expiresIn: (expiresInOverride || ACCESS_EXPIRY),
    });
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};
/* -------- REFRESH TOKEN -------- */
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRY,
    });
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

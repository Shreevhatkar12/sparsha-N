export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ errors: result.error.flatten() });
        return;
    }
    req.body = result.data;
    next();
};

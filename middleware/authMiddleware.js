const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  // Support both Bearer token (API) and session token (browser)
  const token =
    req.session?.token ||
    (req.headers["authorization"] || "").replace("Bearer ", "");

  if (!token) {
    if (req.accepts("html")) return res.redirect("/auth/login");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch {
    if (req.accepts("html")) return res.redirect("/auth/login");
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

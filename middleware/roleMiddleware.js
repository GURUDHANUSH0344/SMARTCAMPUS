exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      if (req.accepts("html")) {
        return res.status(403).render("error", {
          message: "Access denied. You do not have permission for this action.",
          user: req.user,
        });
      }
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
};

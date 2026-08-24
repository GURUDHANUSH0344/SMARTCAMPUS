const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/index");

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render("login", { error: null });
};

// GET /auth/register
exports.getRegister = (req, res) => {
  res.render("register", { error: null });
};

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.render("register", { error: "Email already registered." });
    }

    const hashed = await bcrypt.hash(password, 10);
    // New admin accounts start as "pending" until approved by an existing admin
    const status = role === "admin" ? "pending" : "active";
    await User.create({ name, email, password: hashed, role: role || "student", status });

    if (role === "admin") {
      return res.render("login", { error: "✅ Registration successful! Your admin account is pending approval from an existing admin." });
    }
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.render("register", { error: "Registration failed. Try again." });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.render("login", { error: "User not found." });
    }

    // Role-based verification if explicit role is requested
    if (role && user.role !== role) {
      return res.render("login", { error: `Invalid ${role} credentials.` });
    }

    // Block pending admin accounts
    if (user.role === "admin" && user.status === "pending") {
      return res.render("login", { error: "⏳ Your admin account is pending approval. Please wait for an existing admin to approve your account." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render("login", { error: "Incorrect password." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" }
    );

    req.session.token = token;
    req.session.user = { id: user.id, name: user.name, role: user.role, email: user.email };

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Login failed. Try again." });
  }
};

// GET /auth/logout
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect("/auth/login");
};

// POST /auth/approve/:id — Approve a pending admin (only accessible by active admins)
exports.approveAdmin = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized." });
    }
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user || user.role !== "admin") {
      return res.redirect("/?msg=User not found or not an admin.");
    }
    await user.update({ status: "active" });
    res.redirect("/?msg=Admin approved successfully!");
  } catch (err) {
    console.error(err);
    res.redirect("/?msg=Approval failed.");
  }
};

// POST /auth/reject/:id — Reject and delete a pending admin
exports.rejectAdmin = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized." });
    }
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user || user.role !== "admin") {
      return res.redirect("/?msg=User not found.");
    }
    await user.destroy();
    res.redirect("/?msg=Admin request rejected and removed.");
  } catch (err) {
    console.error(err);
    res.redirect("/?msg=Failed to reject admin.");
  }
};

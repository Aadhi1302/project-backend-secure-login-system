const auth = require("./middleware/auth");

// Example: only logged-in users can access
app.get("/dashboard", auth, (req, res) => {
  res.json({ msg: `Welcome User ${req.user.id}, Role: ${req.user.role}` });
});

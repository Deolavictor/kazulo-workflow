import jwt from "jsonwebtoken";

export const GUEST_VIEWER = {
  id: 0,
  username: "visualizacao",
  name: "Somente visualização",
  role: "viewer",
  sector: null
};

export function isViewerUser(user) {
  return user?.role === "viewer";
}

export function signViewerToken(jwtSecret) {
  return jwt.sign(
    { sub: "viewer", role: "viewer", sector: null },
    jwtSecret,
    { expiresIn: "1d" }
  );
}

export function resolveUserFromToken(payload, findUserById) {
  if (payload.role === "viewer" || payload.sub === "viewer") {
    return { ...GUEST_VIEWER };
  }
  return findUserById(payload.sub);
}

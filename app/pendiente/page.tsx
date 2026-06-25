export default function PendientePage() {
  return (
    <div style={{ maxWidth: 680, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Acceso pendiente</h1>
      <p style={{ marginTop: 10 }}>
        Tu usuario aún no tiene rol asignado (admin o vendedor) o falta el perfil en la colección <b>users</b>.
      </p>
      <p style={{ marginTop: 10 }}>
        Contacta al administrador para activar tu cuenta.
      </p>
      <a href="/login" style={{ display: "inline-block", marginTop: 16 }}>
        Volver a Login
      </a>
    </div>
  );
}
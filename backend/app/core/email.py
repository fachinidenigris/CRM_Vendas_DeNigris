import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_reset_password_email(to_email: str, token: str):
    """
    Envia um e-mail HTML seguro usando o SMTP do Gmail (Custo Zero).
    Reutiliza as credenciais do EMAIL_USER e EMAIL_APP_PASSWORD.
    """
    if not settings.EMAIL_USER or not settings.EMAIL_APP_PASSWORD:
        print("[SMTP_ERROR] Credenciais de e-mail não configuradas.")
        return False

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px; color: #18181b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #000000; text-align: center; font-size: 24px; margin-bottom: 24px;">De Nigris CRM - Recuperação de Senha</h2>
            <p style="font-size: 16px; line-height: 1.5;">Olá,</p>
            <p style="font-size: 16px; line-height: 1.5;">Recebemos uma solicitação para redefinir a senha da sua conta no CRM Vendas De Nigris.</p>
            <p style="font-size: 16px; line-height: 1.5;">Clique no botão abaixo para escolher uma nova senha segura. O link expira em 1 hora.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_link}" style="background-color: #18181b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Redefinir Minha Senha
                </a>
            </div>
            
            <p style="font-size: 14px; color: #71717a; text-align: center;">Se você não solicitou essa redefinição, apenas ignore este e-mail.</p>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
            <p style="font-size: 12px; color: #a1a1aa; text-align: center;">De Nigris CRM &copy; {2026} Todos os direitos reservados.</p>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Recuperação de Senha - De Nigris CRM"
    msg["From"] = f"CRM Vendas De Nigris <{settings.EMAIL_USER}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        # Gmail SMTP
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(settings.EMAIL_USER, settings.EMAIL_APP_PASSWORD)
        server.sendmail(settings.EMAIL_USER, to_email, msg.as_string())
        server.quit()
        print(f"[SMTP_SUCCESS] E-mail de recuperação enviado para {to_email}")
        return True
    except Exception as e:
        print(f"[SMTP_ERROR] Falha ao enviar e-mail: {e}")
        return False

export type Mail = {
  to: string
  subject: string
  text: string
  html?: string
}

export type Mailer = {
  send(mail: Mail): Promise<void>
}

export function getMailer(): Mailer {
  const mode = process.env.MAIL_MODE ?? 'console'

  if (mode === 'console') {
    return {
      async send(mail: Mail) {
        console.log(
          `[mail][console] to=${mail.to} subject="${mail.subject}"\n${mail.text}`
        )
      },
    }
  }

  return {
    async send(mail: Mail) {
      console.log(
        `[mail][console:fallback] to=${mail.to} subject="${mail.subject}"\n${mail.text}`
      )
    },
  }
}
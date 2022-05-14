import email, {MailDataRequired} from '@sendgrid/mail'
if (process.env.EMAIL_API_KEY) {
  email.setApiKey(process.env.EMAIL_API_KEY)
}

export const sendMail = (messages: MailDataRequired | MailDataRequired[]) => {
  if (!process.env.EMAIL_API_KEY) {
    return
  }

  return email.send(messages)
}

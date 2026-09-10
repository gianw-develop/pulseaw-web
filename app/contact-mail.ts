export function buildProjectEmail(input: {
  name: string;
  email: string;
  engagement: string;
  message: string;
}) {
  const subject = `Project enquiry — ${input.engagement || 'Help me choose an engagement'}`;
  const body = `Name: ${input.name}\nEmail: ${input.email}\nEngagement: ${input.engagement || 'To be discussed'}\n\nWhat I am building:\n${input.message}\n`;
  return `mailto:info@pulseaw.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

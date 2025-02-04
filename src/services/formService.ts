export class FormService {
  static async submitEmail(email: string, source= 'website'): Promise<boolean> {
    // Validate email format
    if (!this.validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    const payload = {
      email,
      source, // additional field to track the source of submission
      // You could add more fields here if needed, e.g., languagePreference: 'en'
    };
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Subscription failed');
      }

      return true;
    } catch (error) {
      console.log(error);
      throw new Error('Network error. Please try again.');
    }
  }

  private static validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

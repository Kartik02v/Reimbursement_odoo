import type { Country, Currency } from './types';

export class CurrencyService {
  private static COUNTRY_API = 'https://restcountries.com/v3.1/all?fields=name,currencies,cca2';
  private static EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/';

  /**
   * Fetches all countries and their primary currencies.
   * Maps restcountries API format to our internal Country type.
   */
  static async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch(this.COUNTRY_API, { next: { revalidate: 86400 } }); // Cache for 24h
      if (!response.ok) throw new Error('Failed to fetch countries');
      
      const data = await response.json();
      
      return data
        .filter((c: any) => c.currencies && Object.keys(c.currencies).length > 0)
        .map((c: any) => {
          const currencyCode = Object.keys(c.currencies)[0];
          const currencyInfo = c.currencies[currencyCode];
          
          return {
            code: c.cca2,
            name: c.name.common,
            currency: {
              code: currencyCode,
              name: currencyInfo.name,
              symbol: currencyInfo.symbol || currencyCode,
            }
          };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Fallback to minimal list if API fails
      return [
        { code: 'US', name: 'United States', currency: { code: 'USD', name: 'US Dollar', symbol: '$' } },
        { code: 'IN', name: 'India', currency: { code: 'INR', name: 'Indian Rupee', symbol: '₹' } },
      ];
    }
  }

  /**
   * Fetches the latest exchange rates for a base currency.
   */
  static async getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.EXCHANGE_RATE_API}${baseCurrency}`, { 
        next: { revalidate: 3600 } // Cache for 1h
      });
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      
      const data = await response.json();
      return data.rates || {};
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return { [baseCurrency]: 1 };
    }
  }

  /**
   * Converts an amount from one currency to another using live rates.
   */
  static async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    
    const rates = await this.getExchangeRates(from);
    const rate = rates[to];
    
    if (!rate) {
      console.warn(`No exchange rate found for ${from} to ${to}`);
      return amount;
    }
    
    return amount * rate;
  }
}

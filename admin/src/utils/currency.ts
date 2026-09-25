/**
 * Currency Utility for Étoile Ballet Academy
 * Standardized for Egyptian Pounds (EGP / ج.م)
 */

export const CURRENCY_CODE = 'EGP';
export const CURRENCY_SYMBOL_EN = 'EGP';
export const CURRENCY_SYMBOL_AR = 'ج.م';

/**
 * Format a number as Egyptian Pounds (EGP)
 * @param amount Number to format
 * @param language 'en' | 'ar'
 * @param showDecimals Whether to display 2 decimal places (default false for clean integer prices)
 */
export function formatCurrency(
  amount: number | null | undefined,
  language: 'en' | 'ar' = 'en',
  showDecimals: boolean = false
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return language === 'ar' ? `0 ${CURRENCY_SYMBOL_AR}` : `${CURRENCY_SYMBOL_EN} 0`;
  }

  const absAmount = Math.abs(amount);
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  const sign = amount < 0 ? '-' : '';

  if (language === 'ar') {
    return `${sign}${formattedNumber} ${CURRENCY_SYMBOL_AR}`;
  }

  return `${sign}${CURRENCY_SYMBOL_EN} ${formattedNumber}`;
}

/**
 * Returns the localized currency label
 */
export function getCurrencyLabel(language: 'en' | 'ar' = 'en'): string {
  return language === 'ar' ? CURRENCY_SYMBOL_AR : CURRENCY_SYMBOL_EN;
}

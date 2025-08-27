import { useTranslation } from 'react-i18next'

export interface CurrencyConfig {
  symbol: string
  name: string
  code: string
  position: 'before' | 'after'
  decimalPlaces: number
  thousandSeparator: string
  decimalSeparator: string
}

export const CURRENCY_CONFIGS: { [key: string]: CurrencyConfig } = {
  'th': {
    symbol: '฿',
    name: 'บาท',
    code: 'THB',
    position: 'after',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.'
  },
  'en': {
    symbol: '$',
    name: 'Dollar',
    code: 'USD',
    position: 'before',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.'
  },
  'lo': {
    symbol: '₭',
    name: 'ກີບ',
    code: 'LAK',
    position: 'after',
    decimalPlaces: 0, // Kip typically doesn't use decimal places
    thousandSeparator: ',',
    decimalSeparator: '.'
  }
}

/**
 * Format a number as currency based on the current language
 */
export function formatCurrency(amount: number, language: string = 'th'): string {
  const config = CURRENCY_CONFIGS[language] || CURRENCY_CONFIGS['th']
  
  // Format the number with appropriate decimal places
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces
  })
  
  // Replace separators if needed
  let finalNumber = formattedNumber
  if (config.thousandSeparator !== ',') {
    finalNumber = finalNumber.replace(/,/g, config.thousandSeparator)
  }
  if (config.decimalSeparator !== '.') {
    finalNumber = finalNumber.replace(/\./g, config.decimalSeparator)
  }
  
  // Position the currency symbol
  if (config.position === 'before') {
    return `${config.symbol}${finalNumber}`
  } else {
    return `${finalNumber} ${config.symbol}`
  }
}

/**
 * Parse a currency string back to a number
 */
export function parseCurrency(currencyString: string, language: string = 'th'): number {
  const config = CURRENCY_CONFIGS[language] || CURRENCY_CONFIGS['th']
  
  // Remove currency symbol and spaces
  let cleanString = currencyString.replace(config.symbol, '').trim()
  
  // Replace custom separators with standard ones
  if (config.thousandSeparator !== ',') {
    cleanString = cleanString.replace(new RegExp(`\\${config.thousandSeparator}`, 'g'), ',')
  }
  if (config.decimalSeparator !== '.') {
    cleanString = cleanString.replace(new RegExp(`\\${config.decimalSeparator}`, 'g'), '.')
  }
  
  // Remove thousand separators and parse
  cleanString = cleanString.replace(/,/g, '')
  return parseFloat(cleanString) || 0
}

/**
 * Get currency symbol for the current language
 */
export function getCurrencySymbol(language: string = 'th'): string {
  const config = CURRENCY_CONFIGS[language] || CURRENCY_CONFIGS['th']
  return config.symbol
}

/**
 * Get currency name for the current language
 */
export function getCurrencyName(language: string = 'th'): string {
  const config = CURRENCY_CONFIGS[language] || CURRENCY_CONFIGS['th']
  return config.name
}

/**
 * Get currency code for the current language
 */
export function getCurrencyCode(language: string = 'th'): string {
  const config = CURRENCY_CONFIGS[language] || CURRENCY_CONFIGS['th']
  return config.code
}

/**
 * Hook to get currency formatting functions for the current language
 */
export function useCurrency() {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language || 'th'
  
  return {
    formatCurrency: (amount: number) => formatCurrency(amount, currentLanguage),
    parseCurrency: (currencyString: string) => parseCurrency(currencyString, currentLanguage),
    getCurrencySymbol: () => getCurrencySymbol(currentLanguage),
    getCurrencyName: () => getCurrencyName(currentLanguage),
    getCurrencyCode: () => getCurrencyCode(currentLanguage),
    config: CURRENCY_CONFIGS[currentLanguage] || CURRENCY_CONFIGS['th']
  }
}

/**
 * Convert between different currencies (simplified - in real app you'd use exchange rates)
 */
export function convertCurrency(
  amount: number, 
  fromLanguage: string, 
  toLanguage: string
): number {
  // This is a simplified conversion for demo purposes
  // In a real application, you would use actual exchange rates
  
  const exchangeRates: { [key: string]: { [key: string]: number } } = {
    'th': { 'en': 0.028, 'lo': 240 }, // 1 THB = 0.028 USD, 1 THB = 240 LAK
    'en': { 'th': 35.7, 'lo': 8580 }, // 1 USD = 35.7 THB, 1 USD = 8580 LAK
    'lo': { 'th': 0.0042, 'en': 0.000117 } // 1 LAK = 0.0042 THB, 1 LAK = 0.000117 USD
  }
  
  if (fromLanguage === toLanguage) {
    return amount
  }
  
  const rate = exchangeRates[fromLanguage]?.[toLanguage]
  if (!rate) {
    return amount // Return original amount if no conversion rate available
  }
  
  return amount * rate
}


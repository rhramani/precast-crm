import { getCountryCallingCode } from 'react-phone-number-input/max';
import { Metadata } from 'libphonenumber-js/max';

/**
 * Normalizes and restricts a phone number value to the maximum national length of the country.
 * @param {string} val - E.164 phone number string (e.g. +919876543210)
 * @param {string} country - 2-letter country code (e.g. 'IN')
 * @returns {string} The trimmed phone number value
 */
export const restrictPhoneNumber = (val, country) => {
  if (!val) return '';
  
  // Strip spaces, dashes, parentheses to count digits accurately
  const rawVal = val.replace(/\s+/g, '');
  
  try {
    if (country) {
      const callingCode = getCountryCallingCode(country);
      const metadata = new Metadata();
      metadata.selectNumberingPlan(country);
      const lengths = metadata.numberingPlan.possibleLengths();
      const maxNationalLength = Math.max(...lengths);
      
      const maxTotalLength = 1 + callingCode.length + maxNationalLength; // + is 1 character
      if (rawVal.length > maxTotalLength) {
        return rawVal.slice(0, maxTotalLength);
      }
    }
  } catch (e) {
    console.error('Error in phone number restriction:', e);
  }
  
  return rawVal;
};

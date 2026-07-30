import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X, ChevronRight, Mail, Lock, Eye, EyeOff, Smartphone, Building,
  User, Sparkles, Hotel, Calendar, Headphones, Key, ShieldCheck,
  Zap, TrendingUp, Users as UsersIcon, Target, CreditCard, Star,
  Globe, Heart, MapPin, BookOpen, Shield, Info, Upload, FileText,
  Award, Briefcase, AlertCircle, CheckCircle
} from 'lucide-react';

import {
  login,
  registerClient,
  registerAgent,
  googleLogin,
  uploadAgentDocuments,
  userStore,
  goTo,
} from '../api';   

// ==================== ANIMATION STYLES ====================
const animationStyles = `
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); }
    25% { transform: translateY(-10px) translateX(5px); }
    50% { transform: translateY(-5px) translateX(-5px); }
    75% { transform: translateY(5px) translateX(10px); }
  }
  .animate-slideUp {
    animation: slideUp 0.5s ease-out;
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .animate-float {
    animation: float 15s ease-in-out infinite;
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = animationStyles;
  document.head.appendChild(styleSheet);
}

// ==================== ALERT COMPONENT ====================
const Alert = ({ type, message }) => {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl text-sm mb-4 ${
      isError
        ? 'bg-red-50 border border-red-200 text-red-700'
        : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
    }`}>
      {isError
        ? <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        : <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
};

// ==================== STATUS OVERLAY (loading / success / error) ====================
const BRAND_NAME = 'Umramarket';

/**
 * Single React-driven overlay for the auth flow's loading / success / error states.
 * Replaces the old approach of building popups with document.createElement + innerHTML —
 * this is state-driven, accessible, and shows the exact backend error message to the user
 * (no more generic "Something went wrong" swallowing the real reason).
 */
const StatusOverlay = ({ overlay, onDismiss }) => {
  if (!overlay) return null;
  const { status, accent = 'emerald', title, message, errorDetails, ctaLabel, onCta } = overlay;

  const isBlue = accent === 'blue';
  const ring = isBlue ? 'border-t-blue-600' : 'border-t-emerald-600';
  const gradient = isBlue ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-teal-600';
  const textAccent = isBlue ? 'text-blue-700' : 'text-emerald-700';

  return (
    <div
      role={status === 'error' ? 'alertdialog' : 'status'}
      aria-live="polite"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[3px] animate-fadeIn"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-gray-100 animate-slideUp">
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <div className="p-7 text-center">
          <div className={`text-[11px] font-bold tracking-widest uppercase mb-5 ${textAccent}`}>
            {BRAND_NAME}
          </div>

          {status === 'loading' && (
            <>
              <div className={`mx-auto w-12 h-12 mb-4 border-[3px] border-gray-100 rounded-full ${ring} animate-spin`} />
              <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className={`mx-auto w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 mb-5">{message}</p>
              {ctaLabel && (
                <button
                  onClick={onCta}
                  className={`w-full py-3 bg-gradient-to-r ${gradient} text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300`}
                >
                  {ctaLabel}
                </button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line text-left bg-red-50/70 border border-red-100 rounded-xl p-3.5 mb-5 max-h-48 overflow-y-auto">
                {message}
              </p>
              {Array.isArray(errorDetails) && errorDetails.length > 0 && (
                <ul className="text-xs text-red-600 text-left list-disc list-inside space-y-1 mb-5 -mt-3">
                  {errorDetails.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
              <button
                onClick={onDismiss}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors duration-300"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Full ISO-3166 country list with international dial codes, generated from
 * the `world-countries` dataset. Muslim-travel-relevant countries are pinned
 * to the top for convenience; the remaining 228 are alphabetical.
 * Shared numbering zones (NANP "+1", Russia/Kazakhstan "+7") show the zone
 * code only, matching how it's actually dialed.
 */
const COUNTRY_CODES = [
  { iso: 'SA', name: "Saudi Arabia", dial: '+966', flag: '🇸🇦' },
  { iso: 'KE', name: "Kenya", dial: '+254', flag: '🇰🇪' },
  { iso: 'AE', name: "United Arab Emirates", dial: '+971', flag: '🇦🇪' },
  { iso: 'PK', name: "Pakistan", dial: '+92', flag: '🇵🇰' },
  { iso: 'IN', name: "India", dial: '+91', flag: '🇮🇳' },
  { iso: 'NG', name: "Nigeria", dial: '+234', flag: '🇳🇬' },
  { iso: 'TZ', name: "Tanzania", dial: '+255', flag: '🇹🇿' },
  { iso: 'UG', name: "Uganda", dial: '+256', flag: '🇺🇬' },
  { iso: 'GB', name: "United Kingdom", dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: "United States", dial: '+1', flag: '🇺🇸' },
  { iso: 'EG', name: "Egypt", dial: '+20', flag: '🇪🇬' },
  { iso: 'BD', name: "Bangladesh", dial: '+880', flag: '🇧🇩' },
  { iso: 'ID', name: "Indonesia", dial: '+62', flag: '🇮🇩' },
  { iso: 'MY', name: "Malaysia", dial: '+60', flag: '🇲🇾' },
  { iso: 'TR', name: "T\u00fcrkiye", dial: '+90', flag: '🇹🇷' },
  { iso: 'ZA', name: "South Africa", dial: '+27', flag: '🇿🇦' },
  { iso: 'SO', name: "Somalia", dial: '+252', flag: '🇸🇴' },
  { iso: 'ET', name: "Ethiopia", dial: '+251', flag: '🇪🇹' },
  { iso: 'FR', name: "France", dial: '+33', flag: '🇫🇷' },
  { iso: 'DE', name: "Germany", dial: '+49', flag: '🇩🇪' },
  { iso: 'AF', name: "Afghanistan", dial: '+93', flag: '🇦🇫' },
  { iso: 'AX', name: "\u00c5land Islands", dial: '+358', flag: '🇦🇽' },
  { iso: 'AL', name: "Albania", dial: '+355', flag: '🇦🇱' },
  { iso: 'DZ', name: "Algeria", dial: '+213', flag: '🇩🇿' },
  { iso: 'AS', name: "American Samoa", dial: '+1', flag: '🇦🇸' },
  { iso: 'AD', name: "Andorra", dial: '+376', flag: '🇦🇩' },
  { iso: 'AO', name: "Angola", dial: '+244', flag: '🇦🇴' },
  { iso: 'AI', name: "Anguilla", dial: '+1', flag: '🇦🇮' },
  { iso: 'AG', name: "Antigua and Barbuda", dial: '+1', flag: '🇦🇬' },
  { iso: 'AR', name: "Argentina", dial: '+54', flag: '🇦🇷' },
  { iso: 'AM', name: "Armenia", dial: '+374', flag: '🇦🇲' },
  { iso: 'AW', name: "Aruba", dial: '+297', flag: '🇦🇼' },
  { iso: 'AU', name: "Australia", dial: '+61', flag: '🇦🇺' },
  { iso: 'AT', name: "Austria", dial: '+43', flag: '🇦🇹' },
  { iso: 'AZ', name: "Azerbaijan", dial: '+994', flag: '🇦🇿' },
  { iso: 'BS', name: "Bahamas", dial: '+1', flag: '🇧🇸' },
  { iso: 'BH', name: "Bahrain", dial: '+973', flag: '🇧🇭' },
  { iso: 'BB', name: "Barbados", dial: '+1', flag: '🇧🇧' },
  { iso: 'BY', name: "Belarus", dial: '+375', flag: '🇧🇾' },
  { iso: 'BE', name: "Belgium", dial: '+32', flag: '🇧🇪' },
  { iso: 'BZ', name: "Belize", dial: '+501', flag: '🇧🇿' },
  { iso: 'BJ', name: "Benin", dial: '+229', flag: '🇧🇯' },
  { iso: 'BM', name: "Bermuda", dial: '+1', flag: '🇧🇲' },
  { iso: 'BT', name: "Bhutan", dial: '+975', flag: '🇧🇹' },
  { iso: 'BO', name: "Bolivia", dial: '+591', flag: '🇧🇴' },
  { iso: 'BA', name: "Bosnia and Herzegovina", dial: '+387', flag: '🇧🇦' },
  { iso: 'BW', name: "Botswana", dial: '+267', flag: '🇧🇼' },
  { iso: 'BV', name: "Bouvet Island", dial: '+47', flag: '🇧🇻' },
  { iso: 'BR', name: "Brazil", dial: '+55', flag: '🇧🇷' },
  { iso: 'IO', name: "British Indian Ocean Territory", dial: '+246', flag: '🇮🇴' },
  { iso: 'VG', name: "British Virgin Islands", dial: '+1', flag: '🇻🇬' },
  { iso: 'BN', name: "Brunei", dial: '+673', flag: '🇧🇳' },
  { iso: 'BG', name: "Bulgaria", dial: '+359', flag: '🇧🇬' },
  { iso: 'BF', name: "Burkina Faso", dial: '+226', flag: '🇧🇫' },
  { iso: 'BI', name: "Burundi", dial: '+257', flag: '🇧🇮' },
  { iso: 'KH', name: "Cambodia", dial: '+855', flag: '🇰🇭' },
  { iso: 'CM', name: "Cameroon", dial: '+237', flag: '🇨🇲' },
  { iso: 'CA', name: "Canada", dial: '+1', flag: '🇨🇦' },
  { iso: 'CV', name: "Cape Verde", dial: '+238', flag: '🇨🇻' },
  { iso: 'BQ', name: "Caribbean Netherlands", dial: '+599', flag: '🇧🇶' },
  { iso: 'KY', name: "Cayman Islands", dial: '+1', flag: '🇰🇾' },
  { iso: 'CF', name: "Central African Republic", dial: '+236', flag: '🇨🇫' },
  { iso: 'TD', name: "Chad", dial: '+235', flag: '🇹🇩' },
  { iso: 'CL', name: "Chile", dial: '+56', flag: '🇨🇱' },
  { iso: 'CN', name: "China", dial: '+86', flag: '🇨🇳' },
  { iso: 'CX', name: "Christmas Island", dial: '+61', flag: '🇨🇽' },
  { iso: 'CC', name: "Cocos (Keeling) Islands", dial: '+61', flag: '🇨🇨' },
  { iso: 'CO', name: "Colombia", dial: '+57', flag: '🇨🇴' },
  { iso: 'KM', name: "Comoros", dial: '+269', flag: '🇰🇲' },
  { iso: 'CK', name: "Cook Islands", dial: '+682', flag: '🇨🇰' },
  { iso: 'CR', name: "Costa Rica", dial: '+506', flag: '🇨🇷' },
  { iso: 'HR', name: "Croatia", dial: '+385', flag: '🇭🇷' },
  { iso: 'CU', name: "Cuba", dial: '+53', flag: '🇨🇺' },
  { iso: 'CW', name: "Cura\u00e7ao", dial: '+599', flag: '🇨🇼' },
  { iso: 'CY', name: "Cyprus", dial: '+357', flag: '🇨🇾' },
  { iso: 'CZ', name: "Czechia", dial: '+420', flag: '🇨🇿' },
  { iso: 'DK', name: "Denmark", dial: '+45', flag: '🇩🇰' },
  { iso: 'DJ', name: "Djibouti", dial: '+253', flag: '🇩🇯' },
  { iso: 'DM', name: "Dominica", dial: '+1', flag: '🇩🇲' },
  { iso: 'DO', name: "Dominican Republic", dial: '+1', flag: '🇩🇴' },
  { iso: 'CD', name: "DR Congo", dial: '+243', flag: '🇨🇩' },
  { iso: 'EC', name: "Ecuador", dial: '+593', flag: '🇪🇨' },
  { iso: 'SV', name: "El Salvador", dial: '+503', flag: '🇸🇻' },
  { iso: 'GQ', name: "Equatorial Guinea", dial: '+240', flag: '🇬🇶' },
  { iso: 'ER', name: "Eritrea", dial: '+291', flag: '🇪🇷' },
  { iso: 'EE', name: "Estonia", dial: '+372', flag: '🇪🇪' },
  { iso: 'SZ', name: "Eswatini", dial: '+268', flag: '🇸🇿' },
  { iso: 'FK', name: "Falkland Islands", dial: '+500', flag: '🇫🇰' },
  { iso: 'FO', name: "Faroe Islands", dial: '+298', flag: '🇫🇴' },
  { iso: 'FJ', name: "Fiji", dial: '+679', flag: '🇫🇯' },
  { iso: 'FI', name: "Finland", dial: '+358', flag: '🇫🇮' },
  { iso: 'GF', name: "French Guiana", dial: '+594', flag: '🇬🇫' },
  { iso: 'PF', name: "French Polynesia", dial: '+689', flag: '🇵🇫' },
  { iso: 'TF', name: "French Southern and Antarctic Lands", dial: '+262', flag: '🇹🇫' },
  { iso: 'GA', name: "Gabon", dial: '+241', flag: '🇬🇦' },
  { iso: 'GM', name: "Gambia", dial: '+220', flag: '🇬🇲' },
  { iso: 'GE', name: "Georgia", dial: '+995', flag: '🇬🇪' },
  { iso: 'GH', name: "Ghana", dial: '+233', flag: '🇬🇭' },
  { iso: 'GI', name: "Gibraltar", dial: '+350', flag: '🇬🇮' },
  { iso: 'GR', name: "Greece", dial: '+30', flag: '🇬🇷' },
  { iso: 'GL', name: "Greenland", dial: '+299', flag: '🇬🇱' },
  { iso: 'GD', name: "Grenada", dial: '+1', flag: '🇬🇩' },
  { iso: 'GP', name: "Guadeloupe", dial: '+590', flag: '🇬🇵' },
  { iso: 'GU', name: "Guam", dial: '+1', flag: '🇬🇺' },
  { iso: 'GT', name: "Guatemala", dial: '+502', flag: '🇬🇹' },
  { iso: 'GG', name: "Guernsey", dial: '+44', flag: '🇬🇬' },
  { iso: 'GN', name: "Guinea", dial: '+224', flag: '🇬🇳' },
  { iso: 'GW', name: "Guinea-Bissau", dial: '+245', flag: '🇬🇼' },
  { iso: 'GY', name: "Guyana", dial: '+592', flag: '🇬🇾' },
  { iso: 'HT', name: "Haiti", dial: '+509', flag: '🇭🇹' },
  { iso: 'HN', name: "Honduras", dial: '+504', flag: '🇭🇳' },
  { iso: 'HK', name: "Hong Kong", dial: '+852', flag: '🇭🇰' },
  { iso: 'HU', name: "Hungary", dial: '+36', flag: '🇭🇺' },
  { iso: 'IS', name: "Iceland", dial: '+354', flag: '🇮🇸' },
  { iso: 'IR', name: "Iran", dial: '+98', flag: '🇮🇷' },
  { iso: 'IQ', name: "Iraq", dial: '+964', flag: '🇮🇶' },
  { iso: 'IE', name: "Ireland", dial: '+353', flag: '🇮🇪' },
  { iso: 'IM', name: "Isle of Man", dial: '+44', flag: '🇮🇲' },
  { iso: 'IL', name: "Israel", dial: '+972', flag: '🇮🇱' },
  { iso: 'IT', name: "Italy", dial: '+39', flag: '🇮🇹' },
  { iso: 'CI', name: "Ivory Coast", dial: '+225', flag: '🇨🇮' },
  { iso: 'JM', name: "Jamaica", dial: '+1', flag: '🇯🇲' },
  { iso: 'JP', name: "Japan", dial: '+81', flag: '🇯🇵' },
  { iso: 'JE', name: "Jersey", dial: '+44', flag: '🇯🇪' },
  { iso: 'JO', name: "Jordan", dial: '+962', flag: '🇯🇴' },
  { iso: 'KZ', name: "Kazakhstan", dial: '+7', flag: '🇰🇿' },
  { iso: 'KI', name: "Kiribati", dial: '+686', flag: '🇰🇮' },
  { iso: 'XK', name: "Kosovo", dial: '+383', flag: '🇽🇰' },
  { iso: 'KW', name: "Kuwait", dial: '+965', flag: '🇰🇼' },
  { iso: 'KG', name: "Kyrgyzstan", dial: '+996', flag: '🇰🇬' },
  { iso: 'LA', name: "Laos", dial: '+856', flag: '🇱🇦' },
  { iso: 'LV', name: "Latvia", dial: '+371', flag: '🇱🇻' },
  { iso: 'LB', name: "Lebanon", dial: '+961', flag: '🇱🇧' },
  { iso: 'LS', name: "Lesotho", dial: '+266', flag: '🇱🇸' },
  { iso: 'LR', name: "Liberia", dial: '+231', flag: '🇱🇷' },
  { iso: 'LY', name: "Libya", dial: '+218', flag: '🇱🇾' },
  { iso: 'LI', name: "Liechtenstein", dial: '+423', flag: '🇱🇮' },
  { iso: 'LT', name: "Lithuania", dial: '+370', flag: '🇱🇹' },
  { iso: 'LU', name: "Luxembourg", dial: '+352', flag: '🇱🇺' },
  { iso: 'MO', name: "Macau", dial: '+853', flag: '🇲🇴' },
  { iso: 'MG', name: "Madagascar", dial: '+261', flag: '🇲🇬' },
  { iso: 'MW', name: "Malawi", dial: '+265', flag: '🇲🇼' },
  { iso: 'MV', name: "Maldives", dial: '+960', flag: '🇲🇻' },
  { iso: 'ML', name: "Mali", dial: '+223', flag: '🇲🇱' },
  { iso: 'MT', name: "Malta", dial: '+356', flag: '🇲🇹' },
  { iso: 'MH', name: "Marshall Islands", dial: '+692', flag: '🇲🇭' },
  { iso: 'MQ', name: "Martinique", dial: '+596', flag: '🇲🇶' },
  { iso: 'MR', name: "Mauritania", dial: '+222', flag: '🇲🇷' },
  { iso: 'MU', name: "Mauritius", dial: '+230', flag: '🇲🇺' },
  { iso: 'YT', name: "Mayotte", dial: '+262', flag: '🇾🇹' },
  { iso: 'MX', name: "Mexico", dial: '+52', flag: '🇲🇽' },
  { iso: 'FM', name: "Micronesia", dial: '+691', flag: '🇫🇲' },
  { iso: 'MD', name: "Moldova", dial: '+373', flag: '🇲🇩' },
  { iso: 'MC', name: "Monaco", dial: '+377', flag: '🇲🇨' },
  { iso: 'MN', name: "Mongolia", dial: '+976', flag: '🇲🇳' },
  { iso: 'ME', name: "Montenegro", dial: '+382', flag: '🇲🇪' },
  { iso: 'MS', name: "Montserrat", dial: '+1', flag: '🇲🇸' },
  { iso: 'MA', name: "Morocco", dial: '+212', flag: '🇲🇦' },
  { iso: 'MZ', name: "Mozambique", dial: '+258', flag: '🇲🇿' },
  { iso: 'MM', name: "Myanmar", dial: '+95', flag: '🇲🇲' },
  { iso: 'NA', name: "Namibia", dial: '+264', flag: '🇳🇦' },
  { iso: 'NR', name: "Nauru", dial: '+674', flag: '🇳🇷' },
  { iso: 'NP', name: "Nepal", dial: '+977', flag: '🇳🇵' },
  { iso: 'NL', name: "Netherlands", dial: '+31', flag: '🇳🇱' },
  { iso: 'NC', name: "New Caledonia", dial: '+687', flag: '🇳🇨' },
  { iso: 'NZ', name: "New Zealand", dial: '+64', flag: '🇳🇿' },
  { iso: 'NI', name: "Nicaragua", dial: '+505', flag: '🇳🇮' },
  { iso: 'NE', name: "Niger", dial: '+227', flag: '🇳🇪' },
  { iso: 'NU', name: "Niue", dial: '+683', flag: '🇳🇺' },
  { iso: 'NF', name: "Norfolk Island", dial: '+672', flag: '🇳🇫' },
  { iso: 'KP', name: "North Korea", dial: '+850', flag: '🇰🇵' },
  { iso: 'MK', name: "North Macedonia", dial: '+389', flag: '🇲🇰' },
  { iso: 'MP', name: "Northern Mariana Islands", dial: '+1', flag: '🇲🇵' },
  { iso: 'NO', name: "Norway", dial: '+47', flag: '🇳🇴' },
  { iso: 'OM', name: "Oman", dial: '+968', flag: '🇴🇲' },
  { iso: 'PW', name: "Palau", dial: '+680', flag: '🇵🇼' },
  { iso: 'PS', name: "Palestine", dial: '+970', flag: '🇵🇸' },
  { iso: 'PA', name: "Panama", dial: '+507', flag: '🇵🇦' },
  { iso: 'PG', name: "Papua New Guinea", dial: '+675', flag: '🇵🇬' },
  { iso: 'PY', name: "Paraguay", dial: '+595', flag: '🇵🇾' },
  { iso: 'PE', name: "Peru", dial: '+51', flag: '🇵🇪' },
  { iso: 'PH', name: "Philippines", dial: '+63', flag: '🇵🇭' },
  { iso: 'PN', name: "Pitcairn Islands", dial: '+64', flag: '🇵🇳' },
  { iso: 'PL', name: "Poland", dial: '+48', flag: '🇵🇱' },
  { iso: 'PT', name: "Portugal", dial: '+351', flag: '🇵🇹' },
  { iso: 'PR', name: "Puerto Rico", dial: '+1', flag: '🇵🇷' },
  { iso: 'QA', name: "Qatar", dial: '+974', flag: '🇶🇦' },
  { iso: 'CG', name: "Republic of the Congo", dial: '+242', flag: '🇨🇬' },
  { iso: 'RE', name: "R\u00e9union", dial: '+262', flag: '🇷🇪' },
  { iso: 'RO', name: "Romania", dial: '+40', flag: '🇷🇴' },
  { iso: 'RU', name: "Russia", dial: '+7', flag: '🇷🇺' },
  { iso: 'RW', name: "Rwanda", dial: '+250', flag: '🇷🇼' },
  { iso: 'BL', name: "Saint Barth\u00e9lemy", dial: '+590', flag: '🇧🇱' },
  { iso: 'SH', name: "Saint Helena, Ascension and Tristan da Cunha", dial: '+290', flag: '🇸🇭' },
  { iso: 'KN', name: "Saint Kitts and Nevis", dial: '+1', flag: '🇰🇳' },
  { iso: 'LC', name: "Saint Lucia", dial: '+1', flag: '🇱🇨' },
  { iso: 'MF', name: "Saint Martin", dial: '+590', flag: '🇲🇫' },
  { iso: 'PM', name: "Saint Pierre and Miquelon", dial: '+508', flag: '🇵🇲' },
  { iso: 'VC', name: "Saint Vincent and the Grenadines", dial: '+1', flag: '🇻🇨' },
  { iso: 'WS', name: "Samoa", dial: '+685', flag: '🇼🇸' },
  { iso: 'SM', name: "San Marino", dial: '+378', flag: '🇸🇲' },
  { iso: 'ST', name: "S\u00e3o Tom\u00e9 and Pr\u00edncipe", dial: '+239', flag: '🇸🇹' },
  { iso: 'SN', name: "Senegal", dial: '+221', flag: '🇸🇳' },
  { iso: 'RS', name: "Serbia", dial: '+381', flag: '🇷🇸' },
  { iso: 'SC', name: "Seychelles", dial: '+248', flag: '🇸🇨' },
  { iso: 'SL', name: "Sierra Leone", dial: '+232', flag: '🇸🇱' },
  { iso: 'SG', name: "Singapore", dial: '+65', flag: '🇸🇬' },
  { iso: 'SX', name: "Sint Maarten", dial: '+1', flag: '🇸🇽' },
  { iso: 'SK', name: "Slovakia", dial: '+421', flag: '🇸🇰' },
  { iso: 'SI', name: "Slovenia", dial: '+386', flag: '🇸🇮' },
  { iso: 'SB', name: "Solomon Islands", dial: '+677', flag: '🇸🇧' },
  { iso: 'GS', name: "South Georgia", dial: '+500', flag: '🇬🇸' },
  { iso: 'KR', name: "South Korea", dial: '+82', flag: '🇰🇷' },
  { iso: 'SS', name: "South Sudan", dial: '+211', flag: '🇸🇸' },
  { iso: 'ES', name: "Spain", dial: '+34', flag: '🇪🇸' },
  { iso: 'LK', name: "Sri Lanka", dial: '+94', flag: '🇱🇰' },
  { iso: 'SD', name: "Sudan", dial: '+249', flag: '🇸🇩' },
  { iso: 'SR', name: "Suriname", dial: '+597', flag: '🇸🇷' },
  { iso: 'SJ', name: "Svalbard and Jan Mayen", dial: '+4779', flag: '🇸🇯' },
  { iso: 'SE', name: "Sweden", dial: '+46', flag: '🇸🇪' },
  { iso: 'CH', name: "Switzerland", dial: '+41', flag: '🇨🇭' },
  { iso: 'SY', name: "Syria", dial: '+963', flag: '🇸🇾' },
  { iso: 'TW', name: "Taiwan", dial: '+886', flag: '🇹🇼' },
  { iso: 'TJ', name: "Tajikistan", dial: '+992', flag: '🇹🇯' },
  { iso: 'TH', name: "Thailand", dial: '+66', flag: '🇹🇭' },
  { iso: 'TL', name: "Timor-Leste", dial: '+670', flag: '🇹🇱' },
  { iso: 'TG', name: "Togo", dial: '+228', flag: '🇹🇬' },
  { iso: 'TK', name: "Tokelau", dial: '+690', flag: '🇹🇰' },
  { iso: 'TO', name: "Tonga", dial: '+676', flag: '🇹🇴' },
  { iso: 'TT', name: "Trinidad and Tobago", dial: '+1', flag: '🇹🇹' },
  { iso: 'TN', name: "Tunisia", dial: '+216', flag: '🇹🇳' },
  { iso: 'TM', name: "Turkmenistan", dial: '+993', flag: '🇹🇲' },
  { iso: 'TC', name: "Turks and Caicos Islands", dial: '+1', flag: '🇹🇨' },
  { iso: 'TV', name: "Tuvalu", dial: '+688', flag: '🇹🇻' },
  { iso: 'UA', name: "Ukraine", dial: '+380', flag: '🇺🇦' },
  { iso: 'UM', name: "United States Minor Outlying Islands", dial: '+268', flag: '🇺🇲' },
  { iso: 'VI', name: "United States Virgin Islands", dial: '+1', flag: '🇻🇮' },
  { iso: 'UY', name: "Uruguay", dial: '+598', flag: '🇺🇾' },
  { iso: 'UZ', name: "Uzbekistan", dial: '+998', flag: '🇺🇿' },
  { iso: 'VU', name: "Vanuatu", dial: '+678', flag: '🇻🇺' },
  { iso: 'VA', name: "Vatican City", dial: '+39', flag: '🇻🇦' },
  { iso: 'VE', name: "Venezuela", dial: '+58', flag: '🇻🇪' },
  { iso: 'VN', name: "Vietnam", dial: '+84', flag: '🇻🇳' },
  { iso: 'WF', name: "Wallis and Futuna", dial: '+681', flag: '🇼🇫' },
  { iso: 'EH', name: "Western Sahara", dial: '+212', flag: '🇪🇭' },
  { iso: 'YE', name: "Yemen", dial: '+967', flag: '🇾🇪' },
  { iso: 'ZM', name: "Zambia", dial: '+260', flag: '🇿🇲' },
  { iso: 'ZW', name: "Zimbabwe", dial: '+263', flag: '🇿🇼' },
];

/**
 * Country dial-code dropdown, meant to sit to the left of a phone number input.
 * Keeps the numeric part in its own field so validation/formatting stays simple.
 */
const CountryCodeSelect = ({ value, onChange, accent = 'emerald', id }) => (
  <div className="relative flex-shrink-0">
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Country code"
      className={`pl-3 pr-7 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-${accent}-500/30 focus:border-${accent}-400 transition-all duration-300 hover:border-${accent}-300`}
    >
      {COUNTRY_CODES.map((c) => (
        <option key={c.iso} value={c.dial}>
          {c.flag} {c.dial}
        </option>
      ))}
    </select>
    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
  </div>
);

/** Strips everything but digits from a locally-entered phone number */
const sanitizePhoneDigits = (v) => (v || '').replace(/[^\d]/g, '');

/** Combines a dial code + local number into one string for the backend */
const combinePhone = (countryCode, phone) => {
  const digits = sanitizePhoneDigits(phone);
  if (!digits) return '';
  return `${countryCode || '+254'}${digits}`;
};

/**
 * Maps frontend state to Backend Client requirements
 * Ensures all required fields are present & trimmed
 */
const buildClientPayload = (data) => ({
  firstName: data.firstName?.trim() || '',
  lastName:  data.lastName?.trim() || '',
  email:     data.email?.trim() || '',
  password:  data.password || '',
  phone:     combinePhone(data.countryCode, data.phone),
});

/**
 * Maps frontend state to Backend Agent requirements
 */
const buildAgentPayload = (data) => {
  const firstName = data.directorFirstName?.trim() || '';
  const lastName = data.directorLastName?.trim() || '';
  return {
    firstName,
    lastName,
    email:         data.email?.trim().toLowerCase() || '',
    password:      data.password || '',
    phone:         combinePhone(data.countryCode, data.phone),
    companyName: data.agencyName?.trim() || '',
    licenseNumber: data.licenseNumber?.trim() || '',
    role:          'agent',
  };
};

// Agent validation
const validateAgentForm = (data) => {
  const errs = [];
  if (!data.agencyName?.trim())
    errs.push('Agency/Business Name is required.');

  const directorFirstName = data.directorFirstName?.trim() || '';
  const directorLastName = data.directorLastName?.trim() || '';
  if (!directorFirstName || directorFirstName.length < 2)
    errs.push('Director/Owner First Name must be at least 2 characters.');
  if (!directorLastName || directorLastName.length < 2)
    errs.push('Director/Owner Last Name must be at least 2 characters.');

  if (!data.licenseNumber?.trim())
    errs.push('Travel License Number is required.');

  const email = data.email?.trim() || '';
  if (!email) errs.push('Email is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email address.');

  if (!data.password || data.password.length < 8)
    errs.push('Password must be at least 8 characters.');
  else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password))
    errs.push('Password must contain uppercase, lowercase, and a number.');

  if (!sanitizePhoneDigits(data.phone))
    errs.push('Phone number is required.');
  else if (sanitizePhoneDigits(data.phone).length < 7)
    errs.push('Please enter a valid phone number.');

  return errs;
};

// Client-side validation
const validateClientForm = (data) => {
  const errs = [];
  const fname = data.firstName?.trim() || '';
  const lname = data.lastName?.trim() || '';
  
  if (!fname) errs.push('First Name is required.');
  else if (fname.length < 2 || fname.length > 50) errs.push('First Name must be 2–50 characters.');
  else if (!/^[a-zA-Z\s'-]*$/.test(fname)) errs.push('First Name: letters, spaces, hyphens, apostrophes only.');
  
  if (!lname) errs.push('Last Name is required.');
  else if (lname.length < 2 || lname.length > 50) errs.push('Last Name must be 2–50 characters.');
  else if (!/^[a-zA-Z\s'-]*$/.test(lname)) errs.push('Last Name: letters, spaces, hyphens, apostrophes only.');
  
  if (!data.email?.trim()) errs.push('Email is required.');
  if (!data.password || data.password.length < 8) errs.push('Password must be at least 8 characters.');
  if (!sanitizePhoneDigits(data.phone)) errs.push('Phone number is required.');
  else if (sanitizePhoneDigits(data.phone).length < 7) errs.push('Please enter a valid phone number.');
  
  return errs;
};

// ==================== MEMOIZED FORM COMPONENTS ====================

const ClientForm = React.memo(({
  formData, authType, isLoading, showPassword,
  onInputChange, onTogglePassword, onSubmit, onToggleAuthType,
  alert,
}) => (
  <form onSubmit={onSubmit} className="space-y-3.5">
    <Alert {...alert} />

    {authType === 'register' && (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-emerald-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="firstName" value={formData.firstName || ''} onChange={onInputChange}
                placeholder="Muhammad"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
                required autoComplete="given-name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-emerald-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="lastName" value={formData.lastName || ''} onChange={onInputChange}
                placeholder="Ahmed"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
                required autoComplete="family-name" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <div className="flex gap-2">
            <CountryCodeSelect
              id="client-country-code"
              value={formData.countryCode || '+254'}
              onChange={(val) => onInputChange({ target: { name: 'countryCode', value: val } })}
              accent="emerald"
            />
            <div className="relative group flex-1">
              <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
              <input type="tel" name="phone" value={formData.phone || ''} onChange={onInputChange}
                placeholder="712 345 678"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
                autoComplete="tel-national" />
            </div>
          </div>
        </div>
      </>
    )}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Email Address <span className="text-emerald-500">*</span>
      </label>
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
        <input type="email" name="email" value={formData.email || ''} onChange={onInputChange}
          placeholder="your@email.com"
          className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
          required autoComplete="email" />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Password <span className="text-emerald-500">*</span>
      </label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300 pointer-events-none" />
        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={onInputChange}
          placeholder="••••••••"
          className="w-full pl-12 pr-12 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 group-hover:border-emerald-300"
          required autoComplete={authType === 'login' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={onTogglePassword}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors duration-300" tabIndex="-1">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {authType === 'register' && (
        <p className="text-xs text-gray-400 mt-1">Min 8 chars · uppercase · lowercase · number · special char</p>
      )}
    </div>

    {authType === 'login' && (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input type="checkbox" id="remember" className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
          <label htmlFor="remember" className="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <button type="button" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors duration-300">
          Forgot Password?
        </button>
      </div>
    )}

    {authType === 'register' && (
      <div className="flex items-start">
        <input type="checkbox" id="terms" className="h-4 w-4 mt-1 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" required />
        <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
          I agree to the{' '}
          <button type="button" className="text-emerald-600 hover:text-emerald-700 font-semibold">Terms of Service</button>{' '}
          and{' '}
          <button type="button" className="text-emerald-600 hover:text-emerald-700 font-semibold">Privacy Policy</button>
        </label>
      </div>
    )}

    <button type="submit" disabled={isLoading}
      className="relative w-full py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
          <span>Processing...</span>
        </div>
      ) : (
        <>
          <span className="relative">{authType === 'login' ? 'Sign In as Pilgrim' : 'Create Pilgrim Account'}</span>
          <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
        </>
      )}
    </button>

    <div className="text-center pt-1">
      {authType === 'login' ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-500">New here?</span>
          <button type="button" onClick={onToggleAuthType}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/30 hover:-translate-y-0.5">
            <span>Create Account</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button type="button" onClick={onToggleAuthType}
            className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors duration-300 underline underline-offset-2">
            Sign In
          </button>
        </p>
      )}
    </div>
  </form>
));
ClientForm.displayName = 'ClientForm';

const AgentForm = React.memo(({
  formData, authType, isLoading, showPassword,
  onInputChange, onTogglePassword, onSubmit, onToggleAuthType,
  alert,
}) => (
  <form onSubmit={onSubmit} className="space-y-3.5">
    <Alert {...alert} />

    {authType === 'register' && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agency/Business Name <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="text" name="agencyName" value={formData.agencyName || ''} onChange={onInputChange}
              placeholder="Your Agency Name"
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required autoComplete="organization" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Director First Name <span className="text-blue-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="directorFirstName" value={formData.directorFirstName || ''} onChange={onInputChange}
                placeholder="First Name"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
                required autoComplete="given-name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Director Last Name <span className="text-blue-500">*</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
              <input type="text" name="directorLastName" value={formData.directorLastName || ''} onChange={onInputChange}
                placeholder="Last Name"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
                required autoComplete="family-name" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Travel License Number <span className="text-blue-500">*</span>
          </label>
          <div className="relative group">
            <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
            <input type="text" name="licenseNumber" value={formData.licenseNumber || ''} onChange={onInputChange}
              placeholder="License Number"
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
              required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-blue-500">*</span>
          </label>
          <div className="flex gap-2">
            <CountryCodeSelect
              id="agent-country-code"
              value={formData.countryCode || '+254'}
              onChange={(val) => onInputChange({ target: { name: 'countryCode', value: val } })}
              accent="blue"
            />
            <div className="relative group flex-1">
              <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
              <input type="tel" name="phone" value={formData.phone || ''} onChange={onInputChange}
                placeholder="712 345 678"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
                required autoComplete="tel-national" />
            </div>
          </div>
        </div>
      </>
    )}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {authType === 'register' ? 'Business Email' : 'Email Address'} <span className="text-blue-500">*</span>
      </label>
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
        <input type="email" name="email" value={formData.email || ''} onChange={onInputChange}
          placeholder={authType === 'register' ? 'agency@email.com' : 'your@email.com'}
          className="w-full pl-12 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
          required autoComplete="email" />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Password <span className="text-blue-500">*</span>
      </label>
      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300 pointer-events-none" />
        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password || ''} onChange={onInputChange}
          placeholder="••••••••"
          className="w-full pl-12 pr-12 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300"
          required autoComplete={authType === 'login' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={onTogglePassword}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors duration-300" tabIndex="-1">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {authType === 'register' && (
        <p className="text-xs text-gray-400 mt-1">Min 8 chars · uppercase · lowercase · number · special char</p>
      )}
    </div>

    {authType === 'login' && (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input type="checkbox" id="remember-agent" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="remember-agent" className="ml-2 text-sm text-gray-700">Remember me</label>
        </div>
        <button type="button" className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300">
          Forgot Password?
        </button>
      </div>
    )}

    {authType === 'register' && (
      <div className="space-y-2">
        <div className="flex items-start">
          <input type="checkbox" id="agent-terms" className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500" required />
          <label htmlFor="agent-terms" className="ml-2 text-sm text-gray-700">
            I agree to the{' '}
            <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold">Agent Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold">Privacy Policy</button>
          </label>
        </div>
        <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Important:</span> You'll need to upload verification documents from your dashboard.
          </p>
        </div>
      </div>
    )}

    <button type="submit" disabled={isLoading}
      className="relative w-full py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
          <span>Processing...</span>
        </div>
      ) : (
        <>
          <span className="relative">{authType === 'login' ? 'Sign In as Agent' : 'Register Agency'}</span>
          <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
        </>
      )}
    </button>

    <div className="text-center pt-1">
      {authType === 'login' ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-500">Not an agent yet?</span>
          <button type="button" onClick={onToggleAuthType}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-full transition-all duration-300 hover:shadow-md hover:shadow-blue-500/30 hover:-translate-y-0.5">
            <span>Apply Now</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Already registered?{' '}
          <button type="button" onClick={onToggleAuthType}
            className="text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300 underline underline-offset-2">
            Sign In
          </button>
        </p>
      )}
    </div>
  </form>
));
AgentForm.displayName = 'AgentForm';

// ==================== MAIN AUTH MODAL COMPONENT ====================

const AuthModal = ({ onClose, onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('client');
  const [authType, setAuthType] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const [alert, setAlert] = useState({ type: null, message: null });
  const [overlay, setOverlay] = useState(null); // { status, accent, title, message, errorDetails, ctaLabel, onCta }

  const [uploadedFiles, setUploadedFiles] = useState({
    incorporation: null,
    tourism: null,
    krapin: null,
  });

  const modalRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '', password: '', phone: '', countryCode: '+254',
    firstName: '', lastName: '',
    agencyName: '', directorFirstName: '', directorLastName: '', licenseNumber: '',
  });

  const showError = (msg) => setAlert({ type: 'error', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert({ type: null, message: null });

  // Check for Google OAuth result written by GoogleCallback.jsx
useEffect(() => {
  const raw = localStorage.getItem('google_auth_result');
  if (!raw) return;
  localStorage.removeItem('google_auth_result');

  let result;
  try { result = JSON.parse(raw); } catch { return; }

  if (result.type !== 'GOOGLE_OAUTH_SUCCESS' || !result.idToken) return;

  setIsLoading(true);
  googleLogin(result.idToken)
    .then((res) => {
      const user = res.data?.data?.user || res.data?.user;
      if (!user) throw new Error('User data missing from server response');
      userStore.set(user);
      onClose();
      onAuthSuccess(user);
    })
    .catch((err) => {
      showError(err.message || 'Google login failed.');
      setIsLoading(false);
    });
}, [onClose, onAuthSuccess]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAlert({ type: null, message: null });
  }, []);

  const handleTogglePassword = useCallback(() => setShowPassword(p => !p), []);
  const handleToggleAuthType = useCallback(() => {
    setAuthType(p => p === 'login' ? 'register' : 'login');
    clearAlert();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (overlay) return; // don't close the modal while a loading/success/error overlay is showing
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    const onEscape = (e) => { if (e.key === 'Escape' && !overlay) onClose(); };
    document.addEventListener('mousedown', onClickOutside, true);
    document.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('mousedown', onClickOutside, true);
      document.removeEventListener('keydown', onEscape, true);
    };
  }, [onClose, overlay]);

  useEffect(() => {
    return () => clearTimeout(redirectTimeoutRef.current);
  }, []);

  const handleFileUpload = useCallback((e, docType) => {
    const file = e.target.files[0];
    if (file) setUploadedFiles(prev => ({ ...prev, [docType]: file }));
  }, []);

  const handleModeSwitch = useCallback((mode) => {
    setAuthMode(mode);
    clearAlert();
    setFormData({ 
      email: '', password: '', phone: '', countryCode: '+254', firstName: '', lastName: '',
      agencyName: '', directorFirstName: '', directorLastName: '', licenseNumber: '' 
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    clearAlert();
    setOverlay(null);
    clearTimeout(redirectTimeoutRef.current);
    setIsLoading(true);

    try {
      if (authType === 'login') {
        setOverlay({
          status: 'loading',
          accent: 'emerald',
          title: 'Signing you in',
          message: 'Just a moment...',
        });

        const res = await login(formData);
        const user = res.data?.data?.user || res.data?.user;

        if (!user) {
          setOverlay(null);
          showError('Login succeeded but user data is missing. Please try again.');
          setIsLoading(false);
          return;
        }

        // Persist immediately (synchronously, before any overlay/delay) so any
        // caller that reads userStore right after onAuthSuccess — e.g.
        // PackageDetailPage resuming a booking — sees the logged-in user.
        userStore.set(user);

        setOverlay({
          status: 'success',
          accent: 'emerald',
          title: 'Welcome back!',
          message: 'Redirecting you now...',
        });

        // Short, purely cosmetic pause — long enough to read, short enough
        // not to stall someone mid-checkout. userStore is already set above,
        // so anything reacting to onAuthSuccess has correct data immediately.
        redirectTimeoutRef.current = setTimeout(() => {
          setOverlay(null);
          onClose();
          onAuthSuccess(user);
        }, 700);

      } else {
        if (authMode === 'client') {
          const validationErrors = validateClientForm(formData);
          if (validationErrors.length) {
            showError(validationErrors.join(' '));
            setIsLoading(false);
            return;
          }

          setOverlay({
            status: 'loading',
            accent: 'emerald',
            title: 'Creating your account',
            message: 'Setting up your pilgrim profile...',
          });

          const payload = buildClientPayload(formData);
          const res = await registerClient(payload);
          const responseData = res?.data?.data || {};
          const hasSession = Boolean(responseData.accessToken && responseData.refreshToken);

          const user = responseData.user || res.data?.user || {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: payload.phone,
            role: 'client'
          };

          if (hasSession) {
            userStore.set(user);
          }

          // Store user data
          const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: payload.phone
          };
          localStorage.setItem('userData', JSON.stringify(userData));

          const goToClientDashboard = () => {
            clearTimeout(redirectTimeoutRef.current);
            setOverlay(null);
            if (hasSession) {
              onAuthSuccess(user);
              goTo('/client/dashboard?welcome=true');
              return;
            }
            onClose();
            setAuthType('login');
          };

          setOverlay({
            status: 'success',
            accent: 'emerald',
            title: `Welcome, ${formData.firstName}! 🤲`,
            message: hasSession
              ? `Your Umramarket account is ready. We've sent a verification email to ${formData.email} — don't forget to check spam.`
              : `Account created. We've sent a verification email to ${formData.email}. Please confirm your email, then sign in.`,
            ctaLabel: hasSession ? 'Go to Your Dashboard' : 'Back to Sign In',
            onCta: goToClientDashboard,
          });

          redirectTimeoutRef.current = setTimeout(goToClientDashboard, hasSession ? 3000 : 4500);

        } else {
          const validationErrors = validateAgentForm(formData);
          if (validationErrors.length) {
            showError(validationErrors.join(' '));
            setIsLoading(false);
            return;
          }

          setOverlay({
            status: 'loading',
            accent: 'blue',
            title: 'Registering your agency',
            message: 'Setting up your travel partner profile...',
          });

          const payload = buildAgentPayload(formData);
          const res = await registerAgent(payload);

          // BUG FIX: this used to unconditionally treat registration as a
          // logged-in session and redirect to /agent/dashboard. If the
          // backend ever returns without issuing accessToken/refreshToken
          // (e.g. the session-cookie step throws, or an older deploy is
          // still live), the dashboard's getMe()/getagentpackages/etc calls
          // all 401 with "User not found" and the app's 401 handler bounces
          // the brand-new agent straight back to "/" looking like their
          // session "expired" seconds after signing up. Guard the same way
          // the client branch above does.
          const responseData = res?.data?.data || {};
          const hasSession = Boolean(responseData.accessToken && responseData.refreshToken);

          // Store agent data
          const agentData = {
            ...(responseData.user ?? res.data?.user),
            agencyName: formData.agencyName,
            email: formData.email,
            licenseNumber: formData.licenseNumber,
            role: 'agent'
          };

          if (hasSession) {
            userStore.set(agentData);
          }
          localStorage.setItem('agentData', JSON.stringify(agentData));
          sessionStorage.setItem('newAgent', 'true');

          const goToAgentDashboard = () => {
            clearTimeout(redirectTimeoutRef.current);
            setOverlay(null);
            if (hasSession) {
              onAuthSuccess(agentData);
              goTo('/agent/dashboard?welcome=true');
              return;
            }
            onClose();
            setAuthType('login');
          };

          setOverlay({
            status: 'success',
            accent: 'blue',
            title: `Welcome to the family, ${formData.agencyName}! 🎉`,
            message: hasSession
              ? 'Your agency account has been created successfully. Your dashboard is ready with tools to manage clients, bookings, and packages.'
              : `Account created. We've sent a verification email to ${formData.email}. Please sign in to continue.`,
            ctaLabel: hasSession ? 'Go to Your Dashboard' : 'Back to Sign In',
            onCta: goToAgentDashboard,
          });

          redirectTimeoutRef.current = setTimeout(goToAgentDashboard, hasSession ? 3000 : 4500);
        }
      }
    } catch (err) {
      const serverData = err?.response?.data;

      let serverMsg = serverData?.message || serverData?.error || err.message || 'Something went wrong. Please try again.';

      if (Array.isArray(serverData?.details) && serverData.details.length) {
        serverMsg = serverData.details
          .map(d => d.message || d.msg || d.field && `${d.field}: ${d.message}` || JSON.stringify(d))
          .join('\n');
      } else if (serverData?.errors) {
        serverMsg = typeof serverData.errors === 'string'
          ? serverData.errors
          : Object.entries(serverData.errors).map(([k, v]) => `${k}: ${v}`).join('\n');
      } else if (serverMsg.toLowerCase().includes('rate limit')) {
        serverMsg = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (err?.response?.status === 409) {
        serverMsg = 'An account with this email already exists. Please sign in instead.';
      }

      showError(serverMsg);

      clearTimeout(redirectTimeoutRef.current);
      setOverlay({
        status: 'error',
        accent: authMode === 'agent' ? 'blue' : 'emerald',
        title: authType === 'login' ? 'Sign-in failed' : 'Registration failed',
        message: serverMsg,
      });

    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading) return;
    clearAlert();
    setIsLoading(true);

    try {
      await uploadAgentDocuments(uploadedFiles, pendingUserId);
      showSuccess('Documents submitted! Your account will be reviewed within 24–48 hours.');
      setTimeout(() => {
        goTo('/agent/dashboard?verified=true');
      }, 2500);
    } catch (err) {
      showError(err.message || 'Document upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFiles, isLoading, pendingUserId]);


const handleGoogleLogin = useCallback(() => {
  if (isLoading) return;
  clearAlert();
  setIsLoading(true);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    showError('VITE_GOOGLE_CLIENT_ID not set in .env');
    setIsLoading(false);
    return;
  }

 localStorage.removeItem('google_auth_result');
  localStorage.removeItem('google_auth_nonce');

  const rawNonce = Math.random().toString(36).substring(2) + Date.now();

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${window.location.origin}/auth/google/callback`,
    response_type: 'id_token',
    scope:         'openid email profile',
    nonce:         rawNonce,
  });

  const left  = window.screenX + (window.outerWidth  - 500) / 2;
  const top   = window.screenY + (window.outerHeight - 600) / 2;
  const popup = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    'google-signin',
    `width=500,height=600,left=${left},top=${top}`
  );

  if (!popup) {
    showError('Popup blocked — please allow popups for this site.');
    localStorage.removeItem('google_auth_nonce');
    setIsLoading(false);
    return;
  }

  let processed  = false;
  let pollTimer  = null;   // declared here so processResult can access it

  const processResult = async (raw) => {
    if (processed) return;
    processed = true;
    if (pollTimer) clearInterval(pollTimer);

    localStorage.removeItem('google_auth_result');
    localStorage.removeItem('google_auth_nonce');

    let result;
    try { result = JSON.parse(raw); }
    catch {
      showError('Invalid auth response.');
      setIsLoading(false);
      return;
    }

    if (result.type === 'GOOGLE_OAUTH_ERROR') {
      showError(result.error || 'Google sign-in failed.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await googleLogin(result.idToken);
      const user = res.data?.data?.user || res.data?.user;
      if (!user) throw new Error('User data missing from server response');
      userStore.set(user);
      onClose();
      onAuthSuccess(user);
    } catch (err) {
      showError(err.message || 'Google login failed.');
      setIsLoading(false);
    }
  };

  pollTimer = setInterval(() => {
    const raw = localStorage.getItem('google_auth_result');
    if (raw) { processResult(raw); return; }

    try {
      if (popup.closed && !processed) {
        clearInterval(pollTimer);
        setIsLoading(false);
      }
    } catch { /* COOP blocks popup.closed — ignore */ }
  }, 300);

  setTimeout(() => {
    if (!processed) {
      clearInterval(pollTimer);
      localStorage.removeItem('google_auth_result');
      setIsLoading(false);
    }
  }, 300000);

}, [isLoading, onClose, onAuthSuccess]);
  const formProps = useMemo(() => ({
    formData, authType, isLoading, showPassword, alert,
    onInputChange: handleInputChange,
    onTogglePassword: handleTogglePassword,
    onSubmit: handleSubmit,
    onToggleAuthType: handleToggleAuthType,
  }), [formData, authType, isLoading, showPassword, alert,
      handleInputChange, handleTogglePassword, handleSubmit, handleToggleAuthType]);

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-lg animate-fadeIn">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const size = Math.random() * 8 + 4;
          const bg = authMode === 'client'
            ? 'linear-gradient(135deg, #10b981, #0d9488)'
            : 'linear-gradient(135deg, #3b82f6, #6366f1)';
          const delay = `${Math.random() * 5}s`;
          const duration = `${Math.random() * 10 + 10}s`;
          return (
            <div key={i} className="absolute rounded-full opacity-10 animate-float"
              style={{
                left: left + '%',
                top: top + '%',
                width: size + 'px',
                height: size + 'px',
                background: bg,
                animationDelay: delay,
                animationDuration: duration,
              }}>
            </div>
          );
        })}
      </div>

      <div ref={modalRef}
        className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/20 animate-slideUp flex flex-col border border-white/20">
        
        <div className={`h-1.5 flex-shrink-0 ${
          authMode === 'client'
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'
            : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500'
        }`} />

        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-500 hover:scale-110 hover:shadow-xl shadow-lg border border-gray-200/50 flex-shrink-0"
          aria-label="Close modal">
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <div className="overflow-y-auto flex-1">
          {!showDocumentUpload && (
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0 flex-shrink-0">
              <div className="flex bg-gray-100/80 rounded-2xl p-1 mb-3">
                {['client', 'agent'].map((mode) => (
                  <button key={mode}
                    onClick={() => handleModeSwitch(mode)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      authMode === mode
                        ? mode === 'client'
                          ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/10'
                          : 'bg-white text-blue-700 shadow-md shadow-blue-500/10'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {mode === 'client' ? '🕌 Pilgrim' : '🏢 Travel Agent'}
                  </button>
                ))}
              </div>

              <div className="mb-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {authType === 'login'
                    ? `Welcome back${authMode === 'client' ? ', Pilgrim' : ''}`
                    : authMode === 'client' ? 'Begin Your Journey' : 'Register Your Agency'}
                </h2>
                <p className="text-xs text-gray-500">
                  {authType === 'login'
                    ? 'Sign in to continue your spiritual journey'
                    : authMode === 'client'
                    ? 'Create your account to plan your Umrah / Hajj'
                    : 'Join our network of trusted travel partners'}
                </p>
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
            {showDocumentUpload ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Upload Verification Documents</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Required to activate your agent account (reviewed in 24–48 hrs)
                  </p>
                </div>

                <Alert {...alert} />

                <form onSubmit={handleDocumentSubmit} className="space-y-4">
                  {[
                    { key: 'incorporation', label: 'Certificate of Incorporation', desc: 'Official company registration document', icon: <FileText className="h-5 w-5 text-blue-600" /> },
                    { key: 'tourism',       label: 'Tourism License',              desc: 'Tourism board license or permit',        icon: <Award    className="h-5 w-5 text-blue-600" /> },
                    { key: 'krapin',        label: 'Company KRAPIN',               desc: 'Tax identification number or KRAPIN certificate', icon: <Briefcase className="h-5 w-5 text-blue-600" /> },
                  ].map(({ key, label, desc, icon }) => (
                    <div key={key} className="p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300 bg-gray-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">{icon}</div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{label}</h4>
                            <p className="text-xs text-gray-500 mt-1">{desc}</p>
                          </div>
                        </div>
                        <div className="relative ml-4 flex-shrink-0">
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, key)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                          <button type="button"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                              uploadedFiles[key]
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}>
                            {uploadedFiles[key] ? 'Uploaded ✓' : 'Upload'}
                          </button>
                        </div>
                      </div>
                      {uploadedFiles[key] && (
                        <p className="text-xs text-green-600 mt-2 ml-14 truncate">{uploadedFiles[key].name}</p>
                      )}
                    </div>
                  ))}

                  <button type="submit"
                    disabled={isLoading || !uploadedFiles.incorporation || !uploadedFiles.tourism || !uploadedFiles.krapin}
                    className="relative w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-500 transform hover:-translate-y-1 active:scale-[0.99] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <span className="relative">Submit Documents for Verification</span>
                        <ChevronRight className="inline-block ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-500">
                    Your documents will be reviewed within 24–48 hours. You'll receive an email notification once verified.
                  </p>
                </form>
              </div>
            ) : (
              <>
                {/* Google Sign-In Button - CLIENT MODE ONLY */}
                {authMode === 'client' && (
                  <div className="space-y-2 mb-3">
                   {/* Google Sign-In Button */}
<button
  onClick={handleGoogleLogin}
  disabled={isLoading}
  id="google-signin-btn"
  className="w-full group relative flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-[#4285F4] rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 hover:bg-blue-50/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none">
  <div className="w-5 h-5 flex-shrink-0">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  </div>
  <span className="text-[#4285F4] font-bold text-sm tracking-wide">
    {isLoading ? 'Connecting...' : 'Continue with Google'}
  </span>
</button>

{/* Hidden target for Google to render its button into - we trigger the click programmatically */}
<div id="google-btn-target" className="hidden" />

                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-3 bg-white text-gray-400">or continue with email</span>
                      </div>
                    </div>
                  </div>
                )}

                {authMode === 'client'
                  ? <ClientForm {...formProps} />
                  : <AgentForm {...formProps} />}
              </>
            )}
          </div>
        </div>

        {!showDocumentUpload && (
          <div className="px-4 sm:px-6 py-2.5 border-t border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-emerald-50 border border-emerald-100 flex-shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Bank-level Security</span> · 256-bit SSL</div>
              </div>
              <div className="text-xs text-gray-500">
                Need help?{' '}
                <button className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors duration-300">
                  Support
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    <StatusOverlay overlay={overlay} onDismiss={() => setOverlay(null)} />
    </>
  );
};

export default AuthModal;
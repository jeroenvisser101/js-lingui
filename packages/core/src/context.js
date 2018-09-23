// @flow
import type { Locales } from "./i18n"
import { date, number } from "./formats"
import { isString, isFunction } from "./essentials"

type IntlType = {|
  DateTimeFormat: Function,
  NumberFormat: Function
|}

declare var Intl: IntlType

const defaultFormats = (locale, locales, localeData = {}, formats = {}) => {
  locales = locales || locale
  const { plurals } = localeData
  const style = format =>
    isString(format) ? formats[format] || { style: format } : format
  const replaceOctothorpe = (value, message) => {
    return ctx => {
      const msg = isFunction(message) ? message(ctx) : message
      const norm = Array.isArray(msg) ? msg : [msg]
      const formatter = new Intl.NumberFormat(locales)
      const valueStr = formatter.format(value)
      return norm.map(m => (isString(m) ? m.replace("#", valueStr) : m))
    }
  }

  return {
    plural: (value, { offset = 0, ...rules }) => {
      const message = rules[value] || rules[plurals(value - offset)]
      return replaceOctothorpe(value - offset, message)
    },

    selectordinal: (value, { offset = 0, ...rules }) => {
      const message = rules[value] || rules[plurals(value - offset, true)]
      return replaceOctothorpe(value - offset, message)
    },

    select: (value, rules) => rules[value] || rules.other,

    number: (value, format) => number(locales, style(format))(value),

    date: (value, format) => date(locales, style(format))(value),

    undefined: value => value
  }
}

// Params -> CTX
/**
 * Creates a context object, which formats ICU MessageFormat arguments based on
 * argument type.
 *
 * @param locale     - Locale of message
 * @param locales      - Locales to be used when formatting the numbers or dates
 * @param values       - Parameters for variable interpolation
 * @param localeData - Locale data (e.g: plurals)
 * @param formats - Custom format styles
 * @returns {function(string, string, any)}
 */
function context({ locale, locales, values, formats, localeData }: Object) {
  const formatters = defaultFormats(locale, locales, localeData, formats)

  const ctx = (name: string, type: string, format: any) => {
    const value = values[name]
    const formatted = formatters[type](value, format)
    const message = isFunction(formatted) ? formatted(ctx) : formatted
    return Array.isArray(message) ? message.join("") : message
  }

  return ctx
}

export function interpolate(
  translation: Function,
  locale: string,
  locales: ?Locales,
  localeData: Object
) {
  return (values: Object, formats?: Object = {}) => {
    const message = translation(
      context({
        locale,
        locales,
        localeData,
        formats,
        values
      })
    )

    return Array.isArray(message) ? message.join("").trim() : message
  }
}

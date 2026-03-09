const EARTH_RADIUS_KM = 6371;

/**
 * Returns SQL fragment and params for haversine ORDER BY + SELECT distance.
 * @param {string} alias - Table alias (e.g. 'r' or 'a')
 * @param {number} startParamIdx - Next $N index
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {{ select: string, orderBy: string, params: number[], nextIdx: number }}
 */
const haversineSQL = (alias, startParamIdx, lat, lng) => {
  const i = startParamIdx;
  const expr = `
    ${EARTH_RADIUS_KM} * 2 * asin(sqrt(
      sin(radians((${alias}.latitude  - $${i}  ) / 2)) ^ 2 +
      cos(radians($${i}  )) * cos(radians(${alias}.latitude)) *
      sin(radians((${alias}.longitude - $${i + 1}) / 2)) ^ 2
    ))`;
  return {
    select:  `${expr} AS distance`,
    orderBy: `${expr} ASC NULLS LAST`,
    params:  [parseFloat(lat), parseFloat(lng)],
    nextIdx: i + 2,
  };
};

module.exports = { haversineSQL, EARTH_RADIUS_KM };

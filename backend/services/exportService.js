const db = require('../models/db');
const { Parser } = require('json2csv');

const exportRestaurants = async () => {
  const result = await db.query(`
    SELECT r.id, r.name, r.phone, r.address, r.bar, r.cuisine_type,
           r.rating, r.comment, r.visit_date, r.latitude, r.longitude,
           u1.name as created_by, u2.name as updated_by,
           r.created_at, r.updated_at
    FROM restaurants r
    LEFT JOIN users u1 ON r.created_by = u1.id
    LEFT JOIN users u2 ON r.updated_by = u2.id
    WHERE r.is_archived = false
    ORDER BY r.name
  `);

  const fields = ['id','name','phone','address','bar','cuisine_type','rating',
    'comment','visit_date','latitude','longitude','created_by','updated_by',
    'created_at','updated_at'];
  const parser = new Parser({ fields });
  return parser.parse(result.rows);
};

const exportAccommodations = async () => {
  const result = await db.query(`
    SELECT a.id, a.name, a.phone, a.address, a.comment, a.price,
           a.number_of_rooms, a.wifi, a.parking, a.rating, a.visit_date,
           a.latitude, a.longitude,
           u1.name as created_by, u2.name as updated_by,
           a.created_at, a.updated_at
    FROM accommodations a
    LEFT JOIN users u1 ON a.created_by = u1.id
    LEFT JOIN users u2 ON a.updated_by = u2.id
    WHERE a.is_archived = false
    ORDER BY a.name
  `);

  const fields = ['id','name','phone','address','comment','price','number_of_rooms',
    'wifi','parking','rating','visit_date','latitude','longitude',
    'created_by','updated_by','created_at','updated_at'];
  const parser = new Parser({ fields });
  return parser.parse(result.rows);
};

module.exports = { exportRestaurants, exportAccommodations };

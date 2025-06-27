const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Match {
  static async create(matchData) {
    const {
      donationId,
      requirementId,
      donorId,
      receiverId,
      distance,
      matchScore
    } = matchData;

    const id = uuidv4();
    
    const query = `
      INSERT INTO matches (
        id, donation_id, requirement_id, donor_id, receiver_id,
        distance, match_score, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *
    `;
    
    const values = [id, donationId, requirementId, donorId, receiverId, distance, matchScore];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE matches 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async findByDonor(donorId) {
    const query = `
      SELECT m.*, d.food_type, d.quantity, r.organization_name
      FROM matches m
      JOIN donations d ON m.donation_id = d.id
      JOIN requirements r ON m.requirement_id = r.id
      WHERE m.donor_id = $1
      ORDER BY m.created_at DESC
    `;
    
    const result = await pool.query(query, [donorId]);
    return result.rows;
  }

  static async findByReceiver(receiverId) {
    const query = `
      SELECT m.*, d.food_type, d.quantity, d.donor_name
      FROM matches m
      JOIN donations d ON m.donation_id = d.id
      JOIN requirements r ON m.requirement_id = r.id
      WHERE m.receiver_id = $1
      ORDER BY m.created_at DESC
    `;
    
    const result = await pool.query(query, [receiverId]);
    return result.rows;
  }

  static async getAll() {
    const query = `
      SELECT m.*, d.food_type, d.quantity, d.donor_name, r.organization_name
      FROM matches m
      JOIN donations d ON m.donation_id = d.id
      JOIN requirements r ON m.requirement_id = r.id
      ORDER BY m.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Match;
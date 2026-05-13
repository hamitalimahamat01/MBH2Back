import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Organisation from '../models/Organisation.js';
import config from '../config/index.js';

export class AuthService {
  async hashPassword(password) {
    return bcrypt.hash(password, config.bcryptRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  generateToken(organisation) {
    return jwt.sign(
      { 
        id: organisation.id, 
        email: organisation.email, 
        nom: organisation.nom,
        type: organisation.type,
        statut: organisation.statut
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async register(data) {
    const { nom, nomComplet, type, pays, description, dateCreation, email, password } = data;
    
    const existingEmail = await Organisation.findByEmail(email);
    if (existingEmail) {
      throw new Error('Cet email est déjà utilisé');
    }
    
    const existingNom = await Organisation.findByNom(nom);
    if (existingNom) {
      throw new Error('Ce nom d\'organisation est déjà utilisé');
    }
    
    const hashedPassword = await this.hashPassword(password);
    const id = uuidv4();
    
    const organisation = await Organisation.create({
      id, nom, nomComplet, type, pays, description, dateCreation, email, hashedPassword
    });
    
    const token = this.generateToken(organisation);
    return { organisation, token };
  }

  async login(email, password) {
    const organisation = await Organisation.findByEmail(email);
    
    if (!organisation) {
      throw new Error('Email ou mot de passe incorrect');
    }
    
    const isValid = await this.verifyPassword(password, organisation.password);
    if (!isValid) {
      throw new Error('Email ou mot de passe incorrect');
    }
    
    if (organisation.statut !== 'ACTIVE') {
      throw new Error('Votre compte est en attente de validation');
    }
    
    const token = this.generateToken(organisation);
    
    const { password: _, ...organisationSanitized } = organisation;
    
    return {
      organisation: organisationSanitized,
      token
    };
  }

  async getOrganisationById(id) {
    return Organisation.findById(id);
  }

  async getAllOrganisations() {
    return Organisation.findAll(true);
  }
}

export default AuthService;

import { Request, Response, NextFunction } from 'express';
import * as appointmentService from '../services/appointment.service';

export async function createAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appointment = await appointmentService.create(req.body, req.user?.id);
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function getAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query.date) {
      const appointments = await appointmentService.findByDate(req.query.date as string);
      res.json(appointments);
    } else if (req.query.petId) {
      const appointments = await appointmentService.findByPet(req.query.petId as string);
      res.json(appointments);
    } else {
      res.json([]);
    }
  } catch (err) {
    next(err);
  }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appointment = await appointmentService.cancel(req.params.id as string);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function completeAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appointment = await appointmentService.complete(req.params.id as string);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(10),
  consent: z.boolean().refine((val) => val === true),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = contactSchema.parse(req.body);

    // Save to database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        subject: validatedData.subject,
        message: validatedData.message,
      },
    });

    console.log('Contact form submission saved:', contactMessage.id);

    res.json({
      success: true,
      message: 'Message envoyé avec succès',
      id: contactMessage.id,
    });
  } catch (error) {
    console.error('Error processing contact form:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de l'envoi du message",
    });
  }
});

// Get all messages (admin)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

export default router;

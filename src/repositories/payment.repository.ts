// src/repositories/payment.repository.ts
import { PaymentModel } from '@/models/AppAllModels.model';
import prisma from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import logger from '@/utils/logger';

export interface IPaymentRepository {
  createPayment(data: {
    userId: string;
    amount: number;
    currency: string;
    productId?: string | null;
    productType?: string | null;
    status: PaymentStatus;
    stripePaymentIntentId?: string | null;
  }): Promise<PaymentModel>;

  updatePayment(id: string, data: {
    stripePaymentIntentId?: string;
    status?: PaymentStatus;
    errorMessage?: string | null;
  }): Promise<PaymentModel>;

  findPaymentById(id: string): Promise<PaymentModel | null>;

  findPaymentByIntentId(stripePaymentIntentId: string): Promise<PaymentModel | null>;

}


export class PaymentRepository implements IPaymentRepository {

  async createPayment(data: {
    userId: string;
    amount: number;
    currency: string;
    productId?: string | null;
    productType?: string | null;
    status: PaymentStatus;
    stripePaymentIntentId?: string | null;
  }): Promise<PaymentModel> {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          currency: data.currency,
          productId: data.productId,
          productType: data.productType,
          status: data.status,
          stripePaymentIntentId: data.stripePaymentIntentId || null,
        },
      });
      return payment;
    } catch (error) {
      logger.error('Error creating payment record in repository:', error);
      throw error;
    }
  }

  async updatePayment(id: string, data: {
    stripePaymentIntentId?: string;
    status?: PaymentStatus;
    errorMessage?: string | null;
  }): Promise<PaymentModel> {
    try {
      const payment = await prisma.payment.update({
        where: { id },
        data: {
          stripePaymentIntentId: data.stripePaymentIntentId,
          status: data.status,
          errorMessage: data.errorMessage,
          // Ensure updatedAt is handled automatically by Prisma or add manually if needed
        },
      });
      return payment;
    } catch (error) {
      logger.error(`Error updating payment record ${id} in repository:`, error);
      throw error;
    }
  }

  async findPaymentById(id: string): Promise<PaymentModel | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id },
      });
      return payment;
    } catch (error) {
      logger.error(`Error finding payment by ID ${id} in repository:`, error);
      return null; // Or rethrow depending on desired error handling
    }
  }

  async findPaymentByIntentId(stripePaymentIntentId: string): Promise<PaymentModel | null> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId },
      });
      return payment;
    } catch (error) {
      logger.error(`Error finding payment by Intent ID ${stripePaymentIntentId} in repository:`, error);
      return null; // Or rethrow
    }
  }
}


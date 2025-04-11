-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingCycle" TEXT,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "trialEndDate" TIMESTAMP(3),
ADD COLUMN     "trialStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isRecurring" BOOLEAN DEFAULT false,
ADD COLUMN     "relatedSubscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT;

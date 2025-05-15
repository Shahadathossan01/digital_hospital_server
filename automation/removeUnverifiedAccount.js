const cron = require('node-cron');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const HealthHub = require('../models/HealthHub');
const PromoCode = require('../models/PromoCode/PromoCode');

const removeUnverifiedAccounts = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      // const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find unverified users to delete
      const unverifiedUsers = await User.find({
        accountVerified: false,
        // createdAt: { $lt: thirtyMinutesAgo },
      });

      const userIdsToDelete = unverifiedUsers.map(user => user._id);

      if (userIdsToDelete.length === 0) return;

      // Delete related data
      await Promise.all([
        Doctor.deleteMany({ _id: { $in: userIdsToDelete } }),
        Patient.deleteMany({ _id: { $in: userIdsToDelete } }),
        HealthHub.deleteMany({ _id: { $in: userIdsToDelete } }),
        PromoCode.deleteMany({ creatorId: { $in: userIdsToDelete } }), // <== PromoCodes
        User.deleteMany({ _id: { $in: userIdsToDelete } }),
      ]);

      // console.log(`Deleted ${userIdsToDelete.length} unverified users and related data.`);
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });
};

module.exports = removeUnverifiedAccounts;

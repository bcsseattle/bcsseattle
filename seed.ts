/**
 * BCS Seattle Database Seed Script
 * Populates database with realistic test data
 */
import { createSeedClient } from "@snaplet/seed";
import { copycat } from '@snaplet/copycat';

const main = async () => {
  // Initialize seed client
  const seed = await createSeedClient();
  const cc = copycat('fixed-seed');
  
  // Reset database
  await seed.$resetDatabase();
  
  console.log("Creating auth users...");
  // Create auth users (foundation of the system)
  const authUsers = await seed.auth_users((x) => x(10, (index) => ({
    email: cc.email(`user${index}@example.com`),
    raw_user_meta_data: {
      full_name: cc.fullName(),
      avatar_url: `https://i.pravatar.cc/150?u=${cc.uuid()}`
    }
  })));
  
  console.log("Creating organization...");
  // Create organization
  const organization = await seed.organization({
    name: "Bangladeshi Community in Seattle",
    address: cc.streetAddress(),
    city: "Seattle",
    state: "WA",
    zip: cc.zipCode(),
    country: "USA",
    phone: cc.phoneNumber(),
    email: "info@bcsseattle.org", 
    ein: "12-3456789",
    description: "Supporting the Bangladeshi community in Seattle area"
  });
  
  console.log("Creating programs...");
  // Create programs
  await seed.programs([
    { key: "general-purpose", value: "General Fund", active: true },
    { key: "funeral-and-burial", value: "Funeral & Burial Fund", active: true },
    { key: "new-member-support", value: "New Member Support", active: true },
    { key: "youth-programs", value: "Youth Programs", active: true },
    { key: "social-events", value: "Social Events", active: true }
  ]);
  
  console.log("Creating products and prices...");
  // Create products and prices
  const products = await seed.products([
    {
      id: "prod_individual",
      active: true,
      name: "Individual Membership",
      description: "Annual membership for individuals",
      metadata: { type: "membership" }
    },
    {
      id: "prod_family",
      active: true,
      name: "Family Membership",
      description: "Annual membership for families",
      metadata: { type: "membership" }
    }
  ]);
  
  // Create prices for products
  await seed.prices([
    {
      id: "price_individual_monthly",
      product_id: "prod_individual",
      active: true,
      description: "Individual Membership - Monthly",
      unit_amount: 1500, // $15.00
      currency: "USD",
      type: "recurring",
      interval: "month",
      interval_count: 1
    },
    {
      id: "price_individual_yearly",
      product_id: "prod_individual",
      active: true,
      description: "Individual Membership - Yearly",
      unit_amount: 15000, // $150.00
      currency: "USD",
      type: "recurring",
      interval: "year",
      interval_count: 1
    },
    {
      id: "price_family_monthly",
      product_id: "prod_family",
      active: true,
      description: "Family Membership - Monthly",
      unit_amount: 2500, // $25.00
      currency: "USD",
      type: "recurring",
      interval: "month",
      interval_count: 1
    },
    {
      id: "price_family_yearly",
      product_id: "prod_family",
      active: true,
      description: "Family Membership - Yearly",
      unit_amount: 25000, // $250.00
      currency: "USD",
      type: "recurring",
      interval: "year",
      interval_count: 1
    }
  ]);
  
  console.log("Creating customers, donors, and members...");
  // Create customers, donors, and members linked to auth users
  for (let i = 0; i < authUsers.length; i++) {
    const user = authUsers[i];
    const stripeCustomerId = `cus_${cc.nanoid(14)}`;
    
    // Create customer record for Stripe
    const customer = await seed.customers({
      id: user.id,
      stripe_customer_id: stripeCustomerId
    });
    
    // Create donor
    const donor = await seed.donors({
      donor_type: Math.random() > 0.2 ? "individual" : "organization", 
      full_name: user.raw_user_meta_data.full_name,
      organization_name: Math.random() > 0.8 ? cc.company() : null,
      email: user.email,
      phone: cc.phoneNumber(),
      address: cc.streetAddress(),
      city: cc.city(),
      state: cc.state(),
      zip_code: cc.zipCode(),
      country: "USA",
      stripe_customer_id: stripeCustomerId,
      user_id: user.id
    });
    
    // Create member with 70% probability
    if (Math.random() < 0.7) {
      const isFamilyMembership = Math.random() > 0.5;
      const familySize = isFamilyMembership ? Math.floor(Math.random() * 4) + 2 : 1;
      
      const member = await seed.members({
        fullName: user.raw_user_meta_data.full_name,
        phone: cc.phoneNumber(),
        address: donor.address,
        city: donor.city,
        state: donor.state,
        zip: donor.zip_code,
        user_id: user.id,
        stripe_customer_id: customer.id,
        status: Math.random() > 0.2 ? "active" : "pending",
        membershipType: isFamilyMembership ? "Family" : "Individual",
        totalMembersInFamily: familySize,
        terms: true,
        isApproved: Math.random() > 0.2
      });
      
      // Create subscription for member with 60% probability
      if (Math.random() < 0.6) {
        const priceId = isFamilyMembership ? 
          (Math.random() > 0.5 ? "price_family_monthly" : "price_family_yearly") :
          (Math.random() > 0.5 ? "price_individual_monthly" : "price_individual_yearly");
        
        const subscriptionId = `sub_${cc.nanoid(14)}`;
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (priceId.includes("yearly") ? 12 : 1));
        
        // Create subscription
        const subscription = await seed.subscriptions({
          id: subscriptionId,
          user_id: user.id,
          status: "active",
          price_id: priceId,
          quantity: 1,
          cancel_at_period_end: false,
          created: now,
          current_period_start: now,
          current_period_end: endDate
        });
        
        // Update member with subscription
        await seed.members({
          id: member.id,
          subscription_id: subscription.id
        });
      }
    }
    
    // Create donations for this donor
    const numDonations = Math.floor(Math.random() * 5);
    for (let j = 0; j < numDonations; j++) {
      const amount = Math.floor(Math.random() * 20000) / 100 + 10; // $10 to $210
      const isRecurring = Math.random() > 0.7;
      const purposeIndex = Math.floor(Math.random() * 5);
      const purposes = ["general-purpose", "funeral-and-burial", "new-member-support", "youth-programs", "social-events"];
      
      await seed.donations({
        donor_id: donor.id,
        is_anonymous: Math.random() > 0.9,
        donation_amount: amount,
        donation_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
        payment_method: Math.random() > 0.3 ? "card" : Math.random() > 0.5 ? "zelle" : "check",
        currency: "USD",
        stripe_payment_id: Math.random() > 0.3 ? `pi_${cc.nanoid(14)}` : null,
        stripe_customer_id: stripeCustomerId,
        purpose: purposes[purposeIndex],
        donation_status: Math.random() > 0.1 ? "completed" : "pending",
        donation_type: isRecurring ? "recurring" : "one_time",
        donation_interval: isRecurring ? (Math.random() > 0.5 ? "month" : "year") : null,
        is_private: Math.random() > 0.9
      });
    }
  }
  
  console.log("Creating expenses...");
  // Create expenses
  const numExpenses = 15;
  const expenseCategories = ["Rent", "Utilities", "Events", "Supplies", "Food", "Marketing", "Staff", "Insurance"];
  
  for (let i = 0; i < numExpenses; i++) {
    const amount = Math.floor(Math.random() * 100000) / 100 + 50; // $50 to $1050
    const categoryIndex = Math.floor(Math.random() * expenseCategories.length);
    
    await seed.expenses({
      date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 180 days
      amount: amount,
      category: expenseCategories[categoryIndex],
      description: `Payment for ${expenseCategories[categoryIndex].toLowerCase()}`,
      payee: cc.company(),
      payment_method: Math.random() > 0.5 ? "card" : "check",
      is_private: Math.random() > 0.8
    });
  }
  
  console.log("Creating funds...");
  // Create funds/payouts
  const numFunds = 8;
  for (let i = 0; i < numFunds; i++) {
    const amount = Math.floor(Math.random() * 500000) / 100 + 200; // $200 to $5200
    
    await seed.funds({
      id: `py_${cc.nanoid(14)}`,
      date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 180 days
      amount: amount,
      source: Math.random() > 0.5 ? "Stripe" : "External",
      description: `Payout for ${new Date().toLocaleDateString()}`,
      payment_method: Math.random() > 0.5 ? "card" : "bank_transfer",
      currency: "USD",
      stripe_payout_id: Math.random() > 0.5 ? `po_${cc.nanoid(14)}` : null,
      stripe_status: "paid",
      stripe_fees: Math.floor(amount * 0.029 + 30) / 100, // Stripe fee calculation
      status: "completed",
      is_private: Math.random() > 0.8
    });
  }
  
  // console.log("Creating funeral fund interest...");
  // // Create funeral fund interest
  // const numInterests = 5;
  // for (let i = 0; i < numInterests; i++) {
  //   await seed.funeral_fund_interest({
  //     full_name: cc.fullName(),
  //     email: cc.email(),
  //     phone_number: cc.phoneNumber(),
  //     additional_services: Math.random() > 0.6 ? "Yes" : Math.random() > 0.5 ? "No" : "Not sure",
  //     additional_comments: Math.random() > 0.5 ? "Please contact me to discuss details" : null
  //   });
  // }

  console.log("Database seeded successfully!");
  process.exit();
};

main();
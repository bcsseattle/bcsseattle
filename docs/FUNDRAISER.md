# Individual Fundraiser Feature Implementation Scope

## Overview
This document outlines the implementation plan for adding individual fundraisers similar to GoFundMe to the BCS Seattle platform. The feature will allow admins to create fundraisers that members can contribute to, with full tracking of progress and donor information.

## Requirements Summary

### Fundraiser Management
- Admin-only fundraiser creation and management
- Fundraiser details: title, description, goal amount, end date, image
- Categories for fundraisers
- Fundraiser progress tracking
- Optional recurring donations setting per fundraiser

### Donation Process
- Use existing Stripe payment system
- Support minimum donation amounts
- Allow anonymous donations
- Enable donor comments
- Show donor names and amounts (if not anonymous)

### User Experience
- Grid view of active fundraisers
- Progress bars showing funding status
- Fundraiser updates posted by admins
- Fundraiser end date display
- Mobile-responsive design

## 🗃️ Phase 1: Database and Backend Infrastructure

### Database Schema Updates ✅

We have successfully implemented the database schema with the following features:
- Created fundraisers, fundraiser_updates, and fundraiser_donations tables
- Implemented proper RLS policies for security
- Added fundraiser_status and fundraiser_category enums
- Set up automatic current_amount updates via triggers
- Generated and organized TypeScript types

#### 1. Fundraisers Table (Implemented)
```sql
CREATE TYPE fundraiser_category AS ENUM (
    'emergency',
    'medical',
    'education',
    'community',
    'religious',
    'other'
);

CREATE TYPE fundraiser_status AS ENUM (
    'draft',
    'active',
    'completed',
    'cancelled'
);

CREATE TABLE fundraisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_amount NUMERIC(10,2) NOT NULL,
    current_amount NUMERIC(10,2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category fundraiser_category NOT NULL,
    image_url TEXT,
    minimum_donation NUMERIC(10,2) DEFAULT 0,
    enable_recurring BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    status fundraiser_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;

-- Everyone can view active fundraisers
CREATE POLICY "Anyone can view active fundraisers" ON fundraisers
    FOR SELECT USING (status = 'active' OR status = 'completed');

-- Only admins can manage fundraisers
CREATE POLICY "Admins can manage fundraisers" ON fundraisers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

#### 2. Fundraiser Updates Table
```sql
CREATE TABLE fundraiser_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE fundraiser_updates ENABLE ROW LEVEL SECURITY;

-- Everyone can view updates
CREATE POLICY "Anyone can view fundraiser updates" ON fundraiser_updates
    FOR SELECT USING (true);

-- Only admins can create updates
CREATE POLICY "Only admins can create updates" ON fundraiser_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

#### 3. Fundraiser Donations Table
```sql
CREATE TABLE fundraiser_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE CASCADE,
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE fundraiser_donations ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-anonymous donations
CREATE POLICY "Anyone can view non-anonymous donations" ON fundraiser_donations
    FOR SELECT USING (
        NOT is_anonymous OR auth.uid() = (
            SELECT donor_id FROM donations WHERE id = donation_id
        )
    );

-- Function to update fundraiser amounts
CREATE OR REPLACE FUNCTION update_fundraiser_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE fundraisers
        SET current_amount = current_amount + NEW.donation_amount
        WHERE id = NEW.fundraiser_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE fundraisers
        SET current_amount = current_amount - OLD.donation_amount
        WHERE id = OLD.fundraiser_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update fundraiser amounts when donations are made or deleted
CREATE TRIGGER update_fundraiser_amount_trigger
    AFTER INSERT OR DELETE ON donations
    FOR EACH ROW
    WHEN (NEW.fundraiser_id IS NOT NULL OR OLD.fundraiser_id IS NOT NULL)
    EXECUTE FUNCTION update_fundraiser_amount();
```

### API Implementation ✅

We have implemented the core API endpoints with proper authentication, validation, and error handling:

#### Fundraiser Management APIs
1. Fundraiser CRUD Operations
   - ✅ `POST /api/fundraisers` - Create new fundraiser (Admin only)
   - ✅ `GET /api/fundraisers` - List fundraisers (Public)
   - ✅ `GET /api/fundraisers/[id]` - Get fundraiser details (Public)
   - ✅ `PUT /api/fundraisers/[id]` - Update fundraiser (Admin only)
   - ✅ `DELETE /api/fundraisers/[id]` - Delete fundraiser (Admin only)

2. Fundraiser Updates
   - ✅ `POST /api/fundraisers/[id]/updates` - Add update (Admin only)
   - ✅ `GET /api/fundraisers/[id]/updates` - List updates (Public)

3. Fundraiser Donations
   - ✅ `POST /api/fundraisers/[id]/donate` - Process donation (Authenticated users)
   - ✅ `GET /api/fundraisers/[id]/donations` - List donations (Public for non-anonymous)

Key Features Implemented:
- Secure session management using getSession helper
- Input validation using Zod schemas
- Row Level Security (RLS) integration
- Anonymous donation support
- Progress tracking with automatic amount updates
- Admin-only management endpoints

## 🎨 Phase 2: Frontend Implementation ⏳

### Components Structure ✅
```typescript
components/
  fundraisers/
    ✅ fundraiser-card.tsx     // Grid item display with image, progress, and details
    ✅ fundraiser-list.tsx     // Responsive grid layout for fundraisers
    ✅ fundraiser-progress.tsx // Progress bar with amount tracking
    ✅ fundraiser-details.tsx  // Full fundraiser view with all information
    ✅ fundraiser-updates.tsx  // Updates section with admin controls
    ✅ fundraiser-donors.tsx   // Donors list with anonymous support
    admin/
      ✅ fundraiser-form.tsx      // Admin creation form with validation
      ✅ fundraiser-update-form.tsx // Admin update form with validation

Key Form Features:
- Form validation using Zod schemas
- Rich form controls with proper validation states
- Proper error handling and success notifications
- Category and status management
- Image URL support
- Minimum donation configuration
- End date validation
```

Completed Features:
- Responsive grid layout for fundraiser listings
- Progress tracking with visual indicators
- Support for fundraiser images
- Anonymous donor display
- Admin-specific controls and edit options
- Time-relative displays for updates and donations
- Loading states and empty states
- Rich text formatting for descriptions

### Page Structure ✅
```typescript
app/
  fundraisers/
    ✅ page.tsx              // Fundraiser listing with admin controls
    ✅ not-found.tsx         // 404 page for fundraisers
    [id]/
      ✅ page.tsx           // Fundraiser details with updates and donations
      donate/
        ✅ page.tsx        // Secure donation page with form
        ✅ loading.tsx     // Loading state for donation form
    admin/
      new/
        ✅ page.tsx        // Create fundraiser (admin only)
      [id]/
        edit/
          ✅ page.tsx     // Edit fundraiser (admin only)

Donation Features:
- Secure authentication required
- Minimum donation enforcement
- Anonymous donation option
- Optional donor comments
- Loading states
- Error handling
- Stripe integration ready
```

Completed Features:
- Dynamic fundraiser listing with server-side rendering
- Individual fundraiser views with complete details
- Admin-only routes with proper authorization
- Custom 404 page for non-existent fundraisers
- Role-based access control for admin features
- Server-side data fetching with Supabase
- Loading states with skeleton UI:
  * Fundraiser cards with shimmer effect
  * Full fundraiser details loading state
  * Form loading states for admin pages
  * Responsive loading placeholders
  * Seamless loading transitions


### Integration with Existing Donation System

1. Extend current donation form
```typescript
// Enhanced donation form with campaign support
interface DonationFormProps {
  campaign?: Campaign;  // Optional campaign context
  defaultAmount?: string;
  showAnonymousOption?: boolean;
  showCommentField?: boolean;
}
```

2. Update donation handlers
```typescript
// Enhanced donation handler with campaign support
export async function submitDonation(values: DonationFormSchema) {
  const donationDetails: Omit<Donation, 'id'> = {
    ...existingFields,
    campaign_id: values.campaignId || null,
    is_anonymous: values.isAnonymous || false,
    comment: values.comment || null
  };
}
```

## 📱 Phase 3: User Interface Implementation

### Campaign Listing Page
- Grid layout using chadcn/ui Card components
- Category filters
- Progress bars
- Sort options (newest, ending soon, most funded)
- Mobile-responsive design

### Campaign Details Page
- Campaign header with image
- Progress tracking
- Donation button
- Updates section
- Donor wall
- Share buttons

### Admin Dashboard
- Campaign management interface
- Update posting
- Donation tracking
- Campaign performance metrics

## 🔒 Phase 4: Security & Testing

### Security Measures ✅
1. ✅ Admin-only campaign management
   - Implemented through RLS policies
   - Session-based authentication
   - Admin role verification
2. ⏳ Secure file uploads for campaign images
3. ✅ Donation amount validation
   - Zod schema validation
   - Minimum donation checks
4. ✅ Comment moderation capabilities
   - Admin-only update posting
   - Anonymous comment support
5. ⏳ Rate limiting for donations

### Testing Plan
1. Campaign creation/management
2. Donation processing
3. Progress calculation
4. Comment system
5. Mobile responsiveness
6. Admin permissions
7. Edge cases (campaign completion, deletion)

## 📈 Performance & Optimization

### Database Optimization
```sql
-- Indexes for performance
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaign_donations_campaign_id ON campaign_donations(campaign_id);
CREATE INDEX idx_campaign_updates_campaign_id ON campaign_updates(campaign_id);
```

### Caching Strategy
- Cache campaign listings
- Cache campaign details
- Real-time updates for donation progress
- Optimistic UI updates

## 🚀 Deployment Plan

### Pre-deployment Checklist
- [ ] Database migrations tested
- [ ] Admin documentation prepared
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Mobile testing completed

### Post-deployment Monitoring
- Campaign creation success rate
- Donation success rate
- System performance metrics
- Error tracking
- User feedback collection

## 🎯 Success Metrics

1. Campaign Performance
   - Number of successful campaigns
   - Average funding percentage
   - Donor participation rate

2. User Engagement
   - Donation frequency
   - Comment participation
   - Campaign sharing rate

3. Technical Performance
   - Page load times
   - Donation processing success rate
   - Error rates

## 🗓️ Future Enhancements

1. Phase 2 Features
   - Campaign search functionality
   - Enhanced donor recognition
   - Social media integration
   - Email notifications for campaign milestones
   - Campaign updates subscription

2. Phase 3 Features
   - Campaign templates for admins
   - Advanced analytics dashboard
   - Automated campaign suggestions
   - Enhanced donor engagement features

---

The implementation follows BCS Seattle's existing patterns and integrates seamlessly with the current donation system while adding powerful new capabilities for individual fundraising campaigns.


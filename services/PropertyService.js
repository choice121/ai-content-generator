const fetch = require('node-fetch');

function extractListingId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.includes('://')) {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  }
  return trimmed || null;
}

async function fetchProperty(input) {
  const listingId = extractListingId(input);

  if (!listingId) {
    throw { userMessage: 'Please enter a valid property URL or listing ID.', type: 'INVALID_INPUT' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw { userMessage: 'Unable to connect to the database right now. Please try again in a moment.', type: 'CONFIG_ERROR' };
  }

  const endpoint = `${supabaseUrl}/rest/v1/properties?select=*,landlords(contact_name,business_name,avatar_url,verified)&id=eq.${encodeURIComponent(listingId)}&status=eq.active&limit=1`;

  let response;
  try {
    response = await fetch(endpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  } catch (err) {
    console.error(`[PropertyService] Supabase fetch error: ${err.message}`);
    throw { userMessage: 'Unable to connect to the database right now. Please try again in a moment.', type: 'SUPABASE_ERROR' };
  }

  if (!response.ok && response.status !== 206) {
    console.error(`[PropertyService] Supabase returned status ${response.status}`);
    throw { userMessage: 'Unable to connect to the database right now. Please try again in a moment.', type: 'SUPABASE_ERROR' };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw { userMessage: 'Unable to connect to the database right now. Please try again in a moment.', type: 'SUPABASE_ERROR' };
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw { userMessage: "We couldn't find an active listing with that URL or ID. Please check and try again.", type: 'NOT_FOUND' };
  }

  const raw = data[0];
  return normalise(raw, listingId);
}

function normalise(raw, listingId) {
  const landlord = raw.landlords || {};

  const images = [];
  if (Array.isArray(raw.images)) {
    for (const url of raw.images) {
      if (typeof url === 'string' && url.startsWith('http')) {
        images.push(url);
      }
    }
  } else if (raw.image_url) {
    images.push(raw.image_url);
  }

  const property = {
    id: listingId,
    title: raw.title || raw.name || 'Rental Property',
    price: raw.price || raw.rent || null,
    beds: raw.bedrooms || raw.beds || null,
    baths: raw.bathrooms || raw.baths || null,
    location: {
      address: raw.address || null,
      city: raw.city || null,
      state: raw.state || raw.region || null
    },
    description: raw.description || null,
    images: images.slice(0, 6),
    features: Array.isArray(raw.features) ? raw.features : (raw.amenities || []),
    landlord: {
      name: landlord.contact_name || landlord.business_name || null,
      verified: landlord.verified || false
    }
  };

  const hasMinData = property.title !== 'Rental Property' || property.location.city || property.price || property.description;
  if (!hasMinData && property.images.length === 0) {
    throw {
      userMessage: "This listing doesn't have enough information to generate content. Please ensure the listing has a title, location, and at least one photo.",
      type: 'INSUFFICIENT_DATA'
    };
  }

  return property;
}

module.exports = { fetchProperty };

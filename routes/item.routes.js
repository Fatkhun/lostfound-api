const express = require('express');
const supabase = require('../config/supabaseClient'); // Import Supabase client
const { upload } = require('../middlewares/upload');
const auth = require('../middlewares/auth');
const {decode} = require('base64-arraybuffer');
const sharp = require('sharp');

const router = express.Router();

const ALLOWED_TYPES = ['lost', 'found'];
const ALLOWED_CONTACTS = ['whatsapp', 'instagram', 'telegram', 'line', 'other'];

// Function to handle image compression
async function compressImage(file) {
  try {
    // Read the image buffer from file (use sharp to process the image)
    const compressedBuffer = await sharp(file.buffer)
      .resize(800) // Resize to a max width of 800px (you can change this as needed)
      .jpeg({ quality: 50 }) // Compress and set quality to 70%
      .toBuffer(); // Convert it back to buffer

    // Convert the compressed buffer to base64 (optional if needed for Supabase upload)
    const fileBase64 = compressedBuffer.toString("base64");

    return fileBase64; // Return the compressed image buffer (base64 or direct buffer)
  } catch (err) {
    console.error("Error compressing image:", err);
    throw err; // Handle error properly
  }
}


// List items with filter, pagination, and offset
router.get('/', async (req, res) => {
  try {
    const { q, category_id, status, type, offset = 0, limit = 20 } = req.query;

    // Prepare filters
    let filterCat = {};
    let filterCatAll = {};
    let filterStatus = {};  // Changed const to let
    let filterType = {};    // Changed const to let

    const { data: itemCat, error } = await supabase
      .from('categories')
      .select('id');

    if (error) {
        console.error("Error fetching categories:", error.message);
    } else {

        // Build the filter string
        let filterAll = itemCat.map(value => `category_id.eq.${value.id}`).join(',');

        // If you want to remove the trailing comma, you can use slice (although join doesn't leave one in this case)
        filterCatAll = filterAll;
    }

    console.log("filter all ", filterCatAll)

    if (category_id !== '0') {
        filterCat = `category_id.eq.${category_id}`;
    } else {
        filterCat = filterCatAll
    }
    
    // Handle status filter
    if (status !== '') {
      filterStatus = `status.eq.${status}`;
    } else {
      filterStatus = 'status.eq.open,status.eq.claimed'; // If status is empty, fetch both 'open' and 'claimed'
    }

    // Handle type filter
    if (type !== '') {
      filterType = `type.eq.${type}`;
    } else {
      filterType = 'type.eq.lost,type.eq.found'; // If type is empty, fetch both 'lost' and 'found'
    }

    console.log("val1 ", filterStatus);
    console.log("val2 ", filterType);

    // Fetch filtered items from Supabase
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*, owner_id:users(id, name, email), category_id:categories(id, name)')
      .ilike('name', `%${q}%`) 
      .or(filterCat)
      .or(filterStatus) // Handle multiple status filter
      .or(filterType)   // Handle multiple type filter
      .range(offset, offset + limit - 1)
      .order('id', { ascending: false });  // Pagination with offset and limit

    console.log("err ", itemsError);
    if (itemsError) return res.error(itemsError.message);

    // Count total items based on filters
    const { data: totalCount, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .ilike('name', `%${q}%`) 
      .or(filterCat)
      .or(filterStatus)  // Same for status
      .or(filterType)
      .order('id', { ascending: false });   // Same for type

    if (countError) return res.error(countError.message);

    return res.ok({
      items,
      pagination: {
        offset,
        limit,
        total: totalCount.length,
      }
    });
  } catch (e) {
    return res.error(e.message);
  }
});


// History - Items owned by the logged-in user
router.get('/history', auth, async (req, res) => {
  try {
    const { q, user_id, category_id = 0, status = '', type = '', offset = 0, limit = 20 } = req.query;

    // Prepare filters
    let filterCat = {};
    let filterCatAll = {};
    let filterStatus = {};  // Changed const to let
    let filterType = {};    // Changed const to let

    const { data: itemCat, error } = await supabase
      .from('categories')
      .select('id');

    if (error) {
        console.error("Error fetching categories:", error.message);
    } else {

        // Build the filter string
        let filterAll = itemCat.map(value => `category_id.eq.${value.id}`).join(',');

        // If you want to remove the trailing comma, you can use slice (although join doesn't leave one in this case)
        filterCatAll = filterAll;
    }

    console.log("filter all ", filterCatAll)

    if (category_id !== '0') {
        filterCat = `category_id.eq.${category_id}`;
    } else {
        filterCat = filterCatAll
    }
    
    // Handle status filter
    if (status !== '') {
      filterStatus = `status.eq.${status}`;
    } else {
      filterStatus = 'status.eq.open,status.eq.claimed'; // If status is empty, fetch both 'open' and 'claimed'
    }

    // Handle type filter
    if (type !== '') {
      filterType = `type.eq.${type}`;
    } else {
      filterType = 'type.eq.lost,type.eq.found'; // If type is empty, fetch both 'lost' and 'found'
    }

    console.log("val1 ", filterStatus);
    console.log("val2 ", filterType);

    // Fetch filtered items from Supabase
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*, owner_id:users(id, name, email), category_id:categories(id, name)')
      .ilike('name', `%${q}%`)
      .eq("owner_id", user_id) 
      .or(filterCat)
      .or(filterStatus) // Handle multiple status filter
      .or(filterType)   // Handle multiple type filter
      .range(offset, offset + limit - 1)
      .order('id', { ascending: false });  // Pagination with offset and limit

    console.log("err ", itemsError);
    if (itemsError) return res.error(itemsError.message);

    // Count total items based on filters
    const { data: totalCount, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .ilike('name', `%${q}%`) 
      .eq("owner_id", user_id) 
      .or(filterCat)
      .or(filterStatus)  // Same for status
      .or(filterType)
      .order('id', { ascending: false });   // Same for type

    if (countError) return res.error(countError.message);

    return res.ok({
      items,
      pagination: {
        offset,
        limit,
        total: totalCount.length,
      }
    });
  } catch (e) {
    return res.error(e.message);
  }
});

// Item Details
router.get('/:id', async (req, res) => {
  try {
    const { data: item, error } = await supabase
      .from('items')
      .select('*, owner_id:users(id, name, email), category_id:categories(id, name)')
      .eq('id', req.params.id)
      .single();

    if (error || !item) return res.notFound();
    return res.ok(item);
  } catch (e) {
    return res.error(e.message);
  }
});

// Create Item
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const { id, type, name, description, contact_type, contact_value, user_id } = req.body;

    if (!id || !type || !name || !contact_type || !contact_value || !user_id)
      return res.badRequest('Missing required fields');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !user) return res.badRequest('User not found');

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (categoryError || !category) return res.badRequest('Category not found');

    if (!ALLOWED_TYPES.includes(type)) return res.badRequest('Type must be "lost" or "found"');

    const file = req.file;

    if (file) {
        console.log("img1 ", file);

        // decode file buffer to base64
        const fileBase64 = await compressImage(file);

        //console.log("img2 ", fileBase64);

        // upload the file to supabase
        const { data, error } = await supabase.storage
          .from("etemu")
          .upload(file.originalname, decode(fileBase64), {
            contentType: "image/png",
          });

        if (error) {
          throw error;
        }

        // get public url of the uploaded file
        const { data: image } = supabase.storage
          .from("etemu")
          .getPublicUrl(data.path);

        console.log(image.publicUrl);

        const photoUrl = file ? image.publicUrl : "";

        const { error: itemError } = await supabase
          .from('items')
          .insert({
              category_id: category.id,
              type: type,
              name: name,
              description: description,
              photo_url: photoUrl,
              contact_type: contact_type,
              contact_value: contact_value,
              status: "open",
              owner_id: user.id
            })
          .single();

        if (itemError) return res.error(itemError.message);
        return res.created({}, "Posting berhasil");
    }

    const { error: itemError } = await supabase
      .from('items')
      .insert({
          category_id: category.id,
          type: type,
          name: name,
          description: description,
          photo_url: "",
          contact_type: contact_type,
          contact_value: contact_value,
          status: "open",
          owner_id: user.id
        })
      .single();

    if (itemError) return res.error(itemError.message);
    return res.created({}, "Posting berhasil");
  } catch (e) {
    return res.badRequest(e.message);
  }
});

// Update Item
router.patch('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category_id, contact_type, contact_value, status, type } = req.body;

    // Fetch the existing item by its ID
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) return res.notFound(); // Return 404 if item not found

    const updatedFields = {};

    // Update fields based on the provided request body
    if (name !== '') updatedFields.name = name;
    if (description !== '') updatedFields.description = description;
    if (category_id !== '0') updatedFields.category_id = category_id;
    if (contact_type !== '') updatedFields.contact_type = contact_type;
    if (contact_value != '') updatedFields.contact_value = contact_value;
    if (status !== '') updatedFields.status = status;
    if (type !== '') updatedFields.type = type;

    // Handle file upload if a new photo is provided
    if (req.file) {
      // Convert the file to base64 to upload to Supabase storage
      const fileBase64 = decode(req.file.buffer.toString("base64"));

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("etemu")  // Adjust to your Supabase bucket name
        .upload(req.file.originalname, fileBase64, {
          contentType: req.file.mimetype
        });

      if (uploadError) return res.error(uploadError.message);

      // Fetch the public URL of the uploaded file
      const { data: imageData } = supabase.storage
        .from("etemu")
        .getPublicUrl(uploadData.path);

      // Add the URL of the uploaded image to the updated fields
      updatedFields.photo_url = imageData.publicUrl;
    }

    // Update the item in the database
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(updatedFields)
      .eq('id', id)
      .single();

    if (updateError) return res.error(updateError.message); // Handle errors during the update process

    // Return the updated item
    return res.ok({}, 'Berhasil update');
  } catch (e) {
    // Handle any errors that occur during the process
    return res.error(e.message);
  }
});


// Delete Item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) return res.notFound();

    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (deleteError) return res.error(deleteError.message);
    return res.ok({ id }, 'DELETED');
  } catch (e) {
    return res.error(e.message);
  }
});

module.exports = router;

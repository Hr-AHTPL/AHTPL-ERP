// backend/routes/dispatchRoutes.js
const express = require("express");
const router = express.Router();
const Dispatch = require("../models/Dispatch");
const ManufacturingItem = require("../models/ManufacturingItem");
const Item = require("../models/Item");

// Create new dispatch record
router.post("/", async (req, res) => {
  try {
    const { 
      items, 
      destination, 
      customerName, 
      address, 
      contactNumber,
      dispatchDate, 
      deliveryDate,
      transportMode,
      vehicleNumber,
      driverName,
      driverContact,
      dispatchedBy,
      remarks 
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    if (!destination || !dispatchDate) {
      return res.status(400).json({ 
        message: "Destination and dispatch date are required" 
      });
    }

    // Validate and update inventory for each item
    const processedItems = [];
    
    for (const item of items) {
      const { itemId, itemCode, itemName, quantity, itemType } = item;
      
      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ 
          message: "Each item must have itemId and valid quantity" 
        });
      }

      // Check if it's a manufacturing item or bought out item
      let inventoryItem;
      if (itemType === 'manufacturing') {
        inventoryItem = await ManufacturingItem.findById(itemId);
        if (!inventoryItem) {
          return res.status(404).json({ 
            message: `Manufacturing item ${itemCode} not found` 
          });
        }
        
        // Check if sufficient WIP stock is available for dispatch
        if (inventoryItem.wipStock < quantity) {
          return res.status(400).json({ 
            message: `Insufficient WIP stock for ${itemCode}. Available: ${inventoryItem.wipStock}, Required: ${quantity}` 
          });
        }
        
        // Reduce WIP stock
        inventoryItem.wipStock -= quantity;
        inventoryItem.lastUpdated = Date.now();
        await inventoryItem.save();
        
      } else {
        // Bought out item
        inventoryItem = await Item.findById(itemId);
        if (!inventoryItem) {
          return res.status(404).json({ 
            message: `Bought out item ${itemCode} not found` 
          });
        }
        
        // Check if sufficient stock is available
        if (inventoryItem.quantity < quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${itemCode}. Available: ${inventoryItem.quantity}, Required: ${quantity}` 
          });
        }
        
        // Reduce stock
        inventoryItem.quantity -= quantity;
        inventoryItem.lastUpdated = Date.now();
        await inventoryItem.save();
      }

      processedItems.push({
        itemId,
        itemCode: inventoryItem.itemCode,
        itemName: inventoryItem.itemName,
        quantity
      });
    }

    // Create dispatch record
    const dispatch = new Dispatch({
      items: processedItems,
      destination,
      customerName: customerName || "",
      address: address || "",
      contactNumber: contactNumber || "",
      dispatchDate: new Date(dispatchDate),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      transportMode: transportMode || "Road",
      vehicleNumber: vehicleNumber || "",
      driverName: driverName || "",
      driverContact: driverContact || "",
      dispatchedBy: dispatchedBy || "Admin",
      remarks: remarks || "",
      status: "Dispatched"
    });

    await dispatch.save();

    res.status(201).json({
      message: "Dispatch record created successfully",
      dispatch,
      processedItems
    });

  } catch (err) {
    console.error("Create Dispatch Error:", err);
    res.status(500).json({ 
      message: "Failed to create dispatch record",
      error: err.message 
    });
  }
});

// Get all dispatch records with filtering
router.get("/", async (req, res) => {
  try {
    const { 
      status, 
      destination,
      startDate, 
      endDate,
      search,
      page = 1,
      limit = 100
    } = req.query;

    // Build filter query
    let filterQuery = {};

    if (status) filterQuery.status = status;
    if (destination) filterQuery.destination = { $regex: destination, $options: 'i' };

    // Date range filter
    if (startDate || endDate) {
      filterQuery.dispatchDate = {};
      if (startDate) filterQuery.dispatchDate.$gte = new Date(startDate);
      if (endDate) filterQuery.dispatchDate.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filterQuery.$or = [
        { destination: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { 'items.itemCode': { $regex: search, $options: 'i' } },
        { 'items.itemName': { $regex: search, $options: 'i' } }
      ];
    }

    const dispatches = await Dispatch.find(filterQuery)
      .sort({ dispatchDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Dispatch.countDocuments(filterQuery);

    res.json({
      dispatches,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        count: totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error("Fetch Dispatches Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch dispatch records",
      error: err.message 
    });
  }
});

// Get dispatch details for the inventory page (simplified format)
router.get("/details", async (req, res) => {
  try {
    const dispatches = await Dispatch.find({})
      .sort({ dispatchDate: -1 })
      .limit(50); // Limit to recent 50 dispatches

    // Flatten dispatch items for the table view
    const dispatchDetails = [];
    
    dispatches.forEach(dispatch => {
      dispatch.items.forEach(item => {
        dispatchDetails.push({
          itemCode: item.itemCode,
          product: item.itemName,
          department: 'Mixed', // Since we're combining manufacturing and bought out
          quantity: item.quantity,
          workOrder: `WO-${dispatch._id.toString().slice(-6)}`, // Generate work order from dispatch ID
          machine: dispatch.transportMode || 'N/A',
          date: dispatch.dispatchDate
        });
      });
    });

    res.json(dispatchDetails);

  } catch (err) {
    console.error("Fetch Dispatch Details Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch dispatch details",
      error: err.message 
    });
  }
});

// Get single dispatch by ID
router.get("/:id", async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id);
    
    if (!dispatch) {
      return res.status(404).json({ message: "Dispatch not found" });
    }
    
    res.json(dispatch);
  } catch (err) {
    console.error("Get Dispatch Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch dispatch",
      error: err.message 
    });
  }
});

// Update dispatch status and details
router.put("/:id", async (req, res) => {
  try {
    const { 
      status, 
      deliveryDate, 
      vehicleNumber, 
      driverName, 
      driverContact, 
      remarks 
    } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
    if (vehicleNumber !== undefined) updateData.vehicleNumber = vehicleNumber;
    if (driverName !== undefined) updateData.driverName = driverName;
    if (driverContact !== undefined) updateData.driverContact = driverContact;
    if (remarks !== undefined) updateData.remarks = remarks;
    
    updateData.updatedAt = Date.now();

    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!dispatch) {
      return res.status(404).json({ message: "Dispatch not found" });
    }
    
    res.json({ message: "Dispatch updated successfully", dispatch });
  } catch (err) {
    console.error("Update Dispatch Error:", err);
    res.status(500).json({ 
      message: "Failed to update dispatch",
      error: err.message 
    });
  }
});

// Delete dispatch (reverses inventory changes)
router.delete("/:id", async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id);
    
    if (!dispatch) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    // Reverse inventory changes for each item
    for (const item of dispatch.items) {
      // Try to find as manufacturing item first
      const manufacturingItem = await ManufacturingItem.findById(item.itemId);
      if (manufacturingItem) {
        manufacturingItem.wipStock += item.quantity;
        manufacturingItem.lastUpdated = Date.now();
        await manufacturingItem.save();
      } else {
        // Try as bought out item
        const boughtOutItem = await Item.findById(item.itemId);
        if (boughtOutItem) {
          boughtOutItem.quantity += item.quantity;
          boughtOutItem.lastUpdated = Date.now();
          await boughtOutItem.save();
        }
      }
    }

    await Dispatch.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: "Dispatch deleted successfully and inventory restored",
      restoredItems: dispatch.items.length
    });
    
  } catch (err) {
    console.error("Delete Dispatch Error:", err);
    res.status(500).json({ 
      message: "Failed to delete dispatch",
      error: err.message 
    });
  }
});

// Get dispatch statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Dispatch.aggregate([
      {
        $group: {
          _id: null,
          totalDispatches: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" },
          totalItems: { $sum: "$totalItems" },
          uniqueDestinations: { $addToSet: "$destination" }
        }
      }
    ]);

    const statusStats = await Dispatch.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" }
        }
      }
    ]);

    const monthlyStats = await Dispatch.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$dispatchDate" },
            month: { $month: "$dispatchDate" }
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);

    res.json({
      summary: stats[0] || {
        totalDispatches: 0,
        totalQuantity: 0,
        totalItems: 0,
        uniqueDestinations: []
      },
      statusBreakdown: statusStats,
      monthlyTrends: monthlyStats
    });

  } catch (err) {
    console.error("Dispatch Stats Error:", err);
    res.status(500).json({ 
      message: "Failed to fetch dispatch statistics",
      error: err.message 
    });
  }
});

module.exports = router;
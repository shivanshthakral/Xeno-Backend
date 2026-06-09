import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Order item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Order item quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Order item price is required'],
    min: [0, 'Price cannot be negative']
  }
});

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Order must belong to a Customer'],
      index: true
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order must contain at least one item'],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        message: 'Status must be: Pending, Processing, Shipped, Delivered, or Cancelled'
      },
      default: 'Pending',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['Pending', 'Paid', 'Failed'],
        message: 'Payment status must be: Pending, Paid, or Failed'
      },
      default: 'Pending',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate totalAmount dynamically
orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  } else {
    this.totalAmount = 0;
  }
  next();
});

// Update Customer Lifetime Value (CLV) on successful order payment
orderSchema.post('save', async function (doc) {
  if (doc.paymentStatus === 'Paid') {
    try {
      const CustomerModel = mongoose.model('Customer');
      // Sum all completed orders to compute updated CLV
      const OrderModel = mongoose.model('Order');
      const result = await OrderModel.aggregate([
        { $match: { customerId: doc.customerId, paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const newClv = result.length > 0 ? result[0].total : 0;

      await CustomerModel.findByIdAndUpdate(doc.customerId, {
        customerLifetimeValue: newClv
      });
    } catch (error) {
      console.error(`[DATABASE ERROR] Failed to update CLV for customer ${doc.customerId}: ${error.message}`);
    }
  }
});

export const Order = mongoose.model('Order', orderSchema);
export default Order;

const Product = require('../models/product.model');

// 모든 상품 조회
exports.getAllProducts = async (req, res) => {
  try {
    const { 
      origin, 
      type, 
      isActive, 
      isOnSale,
      hasDiscount,
      hasEvent,
      page = 1, 
      limit = 5,
      sort = '-createdAt'
    } = req.query;
    
    const filter = {};
    
    // 필터링 옵션
    if (origin) filter['category.origin'] = origin;
    if (type) filter['category.type'] = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // 판매 중인 상품만 필터링
    if (isOnSale === 'true') {
      const now = new Date();
      filter['salePeriod.start'] = { $lte: now };
      filter['salePeriod.end'] = { $gte: now };
      filter.isActive = true;
    }
    
    // 할인 상품만 필터링
    if (hasDiscount === 'true') {
      filter['discount.enabled'] = 1;
      filter['discount.rate'] = { $gt: 0 };
    }
    
    // 이벤트 상품만 필터링
    if (hasEvent === 'true') {
      filter['event.enabled'] = 1;
      const now = new Date();
      filter['event.startDate'] = { $lte: now };
      filter['event.endDate'] = { $gte: now };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 특정 상품 조회
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }
    
    // 기존 데이터에 size가 없는 경우 기본값 100g으로 채우고, 조회수는 검증 없이 증가
    const update = {
      $inc: { views: 1 }
    };

    if (!product.size) {
      update.$set = {
        ...(update.$set || {}),
        size: '100g'
      };
      product.size = '100g';
    }

    await Product.updateOne({ _id: product._id }, update);
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// SKU로 상품 조회
exports.getProductBySku = async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 상품 생성
exports.createProduct = async (req, res) => {
  try {
    const {
      sku,
      name,
      price,
      size,
      category,
      body,
      acidity,
      image,
      description,
      salePeriod,
      discount,
      event,
      stock
    } = req.body;
    
    // 필수 필드 검증
    if (!sku || !name || !price || !size || !category || !body || !acidity || !image) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 모두 입력해주세요.'
      });
    }
    
    // SKU 중복 확인
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 상품 코드(SKU)입니다.'
      });
    }
    
    // 할인율 검증 (할인이 활성화된 경우 할인율이 0보다 커야 함)
    if (discount && discount.enabled === 1 && (!discount.rate || discount.rate <= 0)) {
      return res.status(400).json({
        success: false,
        message: '할인이 활성화된 경우 할인율을 입력해주세요.'
      });
    }
    
    // 이벤트 기간 검증 (이벤트가 활성화된 경우 기간이 필요함)
    if (event && event.enabled === 1) {
      if (!event.startDate || !event.endDate) {
        return res.status(400).json({
          success: false,
          message: '이벤트가 활성화된 경우 이벤트 시작일과 종료일을 입력해주세요.'
        });
      }
      if (new Date(event.startDate) >= new Date(event.endDate)) {
        return res.status(400).json({
          success: false,
          message: '이벤트 종료일은 시작일보다 늦어야 합니다.'
        });
      }
    }
    
    // 판매 기간 검증
    if (salePeriod && salePeriod.start && salePeriod.end) {
      if (new Date(salePeriod.start) >= new Date(salePeriod.end)) {
        return res.status(400).json({
          success: false,
          message: '판매 종료일은 시작일보다 늦어야 합니다.'
        });
      }
    }
    
    // 상품 생성
    const productData = {
      sku: sku.toUpperCase(),
      name: name.trim(),
      price: parseFloat(price),
      size,
      category: {
        origin: category.origin,
        type: category.type
      },
      body: parseInt(body),
      acidity: parseInt(acidity),
      image: image.trim(),
      description: description ? description.trim() : null,
      stock: stock ? parseInt(stock) : 0,
      discount: {
        enabled: discount?.enabled || 0,
        rate: discount?.rate || 0
      },
      event: {
        enabled: event?.enabled || 0,
        startDate: event?.startDate || null,
        endDate: event?.endDate || null
      }
    };
    
    // 판매 기간 설정
    if (salePeriod && salePeriod.start) {
      productData.salePeriod = {
        start: new Date(salePeriod.start),
        end: salePeriod.end ? new Date(salePeriod.end) : new Date('9999-12-31T23:59:59')
      };
    }
    
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    res.status(201).json({
      success: true,
      message: '상품이 등록되었습니다.',
      data: savedProduct
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 상품 코드(SKU)입니다.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '상품 등록 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 상품 정보 수정 (전체 업데이트)
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      size,
      category,
      body,
      acidity,
      image,
      description,
      salePeriod,
      discount,
      event,
      stock,
      isActive
    } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (size !== undefined) updateData.size = size;
    if (category !== undefined) {
      updateData.category = {
        origin: category.origin,
        type: category.type
      };
    }
    if (body !== undefined) updateData.body = parseInt(body);
    if (acidity !== undefined) updateData.acidity = parseInt(acidity);
    if (image !== undefined) updateData.image = image.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (salePeriod !== undefined) {
      updateData.salePeriod = {
        start: salePeriod.start ? new Date(salePeriod.start) : Date.now(),
        end: salePeriod.end ? new Date(salePeriod.end) : new Date('9999-12-31T23:59:59')
      };
    }
    
    if (discount !== undefined) {
      updateData.discount = {
        enabled: discount.enabled || 0,
        rate: discount.rate || 0
      };
    }
    
    if (event !== undefined) {
      updateData.event = {
        enabled: event.enabled || 0,
        startDate: event.startDate || null,
        endDate: event.endDate || null
      };
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '상품 정보가 수정되었습니다.',
      data: product
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '상품 정보 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 상품 정보 부분 수정
exports.patchProduct = async (req, res) => {
  try {
    const updateData = {};
    const allowedFields = ['name', 'price', 'size', 'category', 'body', 'acidity', 'image', 'description', 'salePeriod', 'discount', 'event', 'stock', 'isActive'];
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'name' || key === 'image' || key === 'description') {
          updateData[key] = req.body[key] ? req.body[key].trim() : null;
        } else if (key === 'price') {
          updateData[key] = parseFloat(req.body[key]);
        } else if (key === 'body' || key === 'acidity' || key === 'stock') {
          updateData[key] = parseInt(req.body[key]);
        } else {
          updateData[key] = req.body[key];
        }
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 필드를 입력해주세요.'
      });
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '상품 정보가 수정되었습니다.',
      data: product
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: '상품 정보 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 상품 삭제
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '상품이 삭제되었습니다.',
      data: {
        id: product._id,
        sku: product.sku,
        name: product.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};


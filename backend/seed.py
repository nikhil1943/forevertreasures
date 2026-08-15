import os
import sys

# Add the current directory to sys.path so 'app' modules can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models

def seed_database():
    print("Refreshing database schema...")
    # Recreate tables to ensure a clean slate
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if database already has data
        if db.query(models.Category).first():
            print("Database already contains data! Wiping existing records...")
            db.query(models.Product).delete()
            db.query(models.Category).delete()
            db.commit()

        print("Seeding categories...")
        categories_data = [
            {"name": "Fine Jewelry", "slug": "fine-jewelry"},
            {"name": "Luxury Timepieces", "slug": "luxury-timepieces"},
            {"name": "Vintage Collectibles", "slug": "vintage-collectibles"},
            {"name": "Artisanal Decor", "slug": "artisanal-decor"},
        ]

        categories = {}
        for cat_info in categories_data:
            category = models.Category(name=cat_info["name"], slug=cat_info["slug"])
            db.add(category)
            db.flush()  # Flush to get category.id assigned
            categories[cat_info["slug"]] = category

        print("Seeding products with high-resolution imagery...")
        products_data = [
            # Fine Jewelry
            {
                "title": "Solitaire Diamond Ring (18k Gold)",
                "description": "Exquisite 1.5-carat ethically sourced diamond...",
                "price": 2499.99,
                "stock_quantity": 8,
                "image_urls": [
                    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["fine-jewelry"].id,
            },
            {
                "title": "Emerald Cut Gemstone Necklace",
                "description": "Vibrant deep-green emerald pendant encased in sterling silver with an adjustable subtle chain.",
                "price": 850.00,
                "stock_quantity": 12,
                "image_urls": [
                    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["fine-jewelry"].id,
            },
            {
                "title": "Minimalist Pearl Drop Earrings",
                "description": "Freshwater cultured pearls suspended from delicate rose gold hooks. Perfect for modern, subtle sophistication.",
                "price": 320.00,
                "stock_quantity": 20,
                "image_urls": [
                    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["fine-jewelry"].id,
            },

            # Luxury Timepieces
            {
                "title": "Chronograph Executive Automatic",
                "description": "Precision automatic movement housed in brushed stainless steel with a sapphire crystal skeleton back.",
                "price": 1850.00,
                "stock_quantity": 5,
                "image_urls": [
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["luxury-timepieces"].id,
            },
            {
                "title": "Classic Heritage Leather Watch",
                "description": "Handcrafted Italian leather strap with a minimalistic sunburst dial and water resistance up to 50 meters.",
                "price": 640.00,
                "stock_quantity": 15,
                "image_urls": [
                    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["luxury-timepieces"].id,
            },

            # Vintage Collectibles
            {
                "title": "Restored Mechanical Typewriter (1960s)",
                "description": "Fully functional vintage mechanical typewriter restored to original factory matte finish with a fresh ribbon.",
                "price": 495.00,
                "stock_quantity": 3,
                "image_urls": [
                    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["vintage-collectibles"].id,
            },
            {
                "title": "Brass Celestial Sundial Compass",
                "description": "Hand-engraved antique brass navigational compass with an adjustable sundial lid and wooden keepsake box.",
                "price": 175.00,
                "stock_quantity": 18,
                "image_urls": [
                    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["vintage-collectibles"].id,
            },

            # Artisanal Decor
            {
                "title": "Handblown Amber Glass Vase",
                "description": "Sculptural glass vessel handcrafted using traditional blowpipe techniques. Adds warm ambient color to any space.",
                "price": 210.00,
                "stock_quantity": 10,
                "image_urls": [
                    "https://images.unsplash.com/photo-1581783342308-f792dbdd77c5?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["artisanal-decor"].id,
            },
            {
                "title": "Minimalist Ceramic Sculpture",
                "description": "Abstract ceramic art piece finished with a textured matte stone glaze. Designed by independent studio artists.",
                "price": 280.00,
                "stock_quantity": 7,
                "image_urls": [
                    "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80"
                ],
                "category_id": categories["artisanal-decor"].id,
            }
        ]

        for prod_info in products_data:
            product = models.Product(**prod_info)
            db.add(product)

        db.commit()
        print(f"Successfully seeded {len(categories_data)} categories and {len(products_data)} products!")

    except Exception as e:
        db.rollback()
        print(f"An error occurred while seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()